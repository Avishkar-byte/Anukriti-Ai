"""
Simulation Manager — orchestrates the full simulation pipeline:
1. LLM analyzes requirements → generates simulation config
2. NumericalEngine runs actual physics computation
3. Returns real computed data
"""

import json
import os
from typing import Any, Dict

from dotenv import load_dotenv

from .engine import NumericalEngine, SimulationConfig, SimulationResult

load_dotenv()

SIM_CONFIG_PROMPT = """You are an expert simulation engineer for medical devices.
Given a list of engineering requirements, generate a simulation configuration that will test and verify the device's behavior.

Available simulation model types:
1. "battery_discharge" — params: nominal_voltage, capacity_ah, load_current, internal_resistance
2. "thermal" — params: ambient_temp, initial_temp, power_watts, thermal_mass, heat_transfer_coeff, max_safe_temp
3. "electrical_circuit" — params: supply_voltage, resistance, capacitance
4. "fluid_flow" — params: flow_rate_ml_per_hour, pump_rpm, pulsation_index, pump_efficiency, reservoir_volume_ml, line_pressure_mmhg
5. "signal_response" — params: signal_frequency_hz, amplitude, dc_offset, noise_amplitude, drift_rate, adc_resolution_bits
6. "motor_drive" — params: supply_voltage, resistance, torque_constant, back_emf_constant, inertia, damping
7. "leakage_current" — params: base_leakage_ua, degradation_rate, safety_limit_ua, temp_coefficient
8. "sensor_noise" — params: true_value, response_time_s, noise_std, saturation_max, saturation_min, unit

RULES:
- Select 3-6 models that are RELEVANT to the device based on its requirements
- Use realistic parameter values for medical devices
- Set duration appropriately (battery tests need longer durations)
- Extract parameter values from the requirements constraints when possible
- Always include a leakage_current model for safety compliance

OUTPUT FORMAT (respond with ONLY valid JSON, no explanation):
{
  "device_name": "Infusion Pump",
  "duration": 100.0,
  "time_steps": 500,
  "models": [
    {
      "type": "battery_discharge",
      "name": "main_battery",
      "params": {"nominal_voltage": 3.7, "capacity_ah": 2.0, "load_current": 0.3}
    },
    {
      "type": "leakage_current",
      "name": "patient_contact",
      "params": {"base_leakage_ua": 8.0, "safety_limit_ua": 100.0}
    }
  ]
}"""


class SimulationManager:
    def __init__(self, sim_repo_path: str = "./temp"):
        self.sim_repo_path = sim_repo_path
        self.engine = NumericalEngine()
        self.llm_enabled = False

        api_key = os.getenv("GROQ_API_KEY")
        model_name = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

        if api_key and api_key != "your_groq_api_key_here":
            try:
                from groq import Groq

                self.client = Groq(api_key=api_key)
                self.model = model_name
                self.llm_enabled = True
                print(f"[SimulationManager] ✅ LLM-powered simulation config ready")
            except Exception as e:
                print(f"[SimulationManager] ⚠️ LLM init failed: {e}")
        else:
            print("[SimulationManager] ⚠️ No API key — using default simulation config")

    async def run_simulation(
        self, config: Dict[str, Any], overrides: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Full simulation pipeline:
        1. Use LLM to generate simulation config from requirements
        2. Run numerical engine
        3. Return real computed data
        """
        device_name = config.get("device_name", "unknown_device")
        requirements = config.get("requirements", [])
        parameters = config.get("parameters", [])

        print(f"[SimulationManager] 🔧 Starting simulation for: {device_name}")

        # Step 1: Generate simulation config
        sim_config = await self._generate_sim_config(
            device_name, requirements, parameters, overrides
        )

        # Step 2: Run actual numerical simulation
        print(
            f"[SimulationManager] ⚡ Running {len(sim_config.models)} physics models..."
        )
        result = self.engine.run(sim_config)
        print(
            f"[SimulationManager] ✅ Simulation completed in {result.duration_seconds}s"
        )
        print(f"[SimulationManager]    Channels: {list(result.channels.keys())}")

        if result.warnings:
            for w in result.warnings:
                print(f"[SimulationManager]    {w}")

        # Step 3: Save results
        result_path = self._save_results(device_name, result)

        return {
            "status": "completed",
            "result_path": result_path,
            "duration_seconds": result.duration_seconds,
            "channels": result.channels,
            "metrics": result.metrics,
            "warnings": result.warnings,
            "models_run": len(sim_config.models),
            "time_steps": sim_config.time_steps,
            "time_array": result.time_array,
        }

    async def _generate_sim_config(
        self,
        device_name: str,
        requirements: list,
        parameters: list,
        overrides: Dict[str, Any] = None,
    ) -> SimulationConfig:
        """Use LLM to intelligently pick simulation models and parameters."""
        if self.llm_enabled and requirements:
            return await self._llm_config(device_name, requirements, overrides)
        return self._default_config(device_name, parameters)

    async def _llm_config(
        self, device_name: str, requirements: list, overrides: Dict[str, Any] = None
    ) -> SimulationConfig:
        """Call LLM to generate simulation configuration."""
        try:
            req_lines = []
            for r in requirements:
                constraints_parts = []
                for c in r.get("constraints", []):
                    desc = c.get("description", "")
                    val = c.get("value", "")
                    unit = c.get("unit", "")
                    constraints_parts.append("%s: %s %s" % (desc, val, unit))
                constraints_str = ", ".join(constraints_parts)
                line = "- [%s] (%s) %s [Constraints: %s]" % (
                    r.get("id", "REQ"),
                    r.get("category", "General"),
                    r.get("description", ""),
                    constraints_str,
                )
                req_lines.append(line)
            req_text = "\n".join(req_lines)

            prompt = f"""Device: {device_name}

Requirements:
{req_text}

Generate a simulation configuration to verify these requirements."""

            if overrides:
                prompt += "\n\nCRITICAL OVERRIDES (Simulate failure or stress tests):\n"
                for k, v in overrides.items():
                    prompt += f"- {k}: {v}\n"
                prompt += "You MUST inject these override parameters directly into the relevant matched models to simulate what-if scenarios."

            print(f"[SimulationManager] 🧠 Calling LLM for simulation planning...")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SIM_CONFIG_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                max_tokens=2048,
                response_format={"type": "json_object"},
            )

            raw = response.choices[0].message.content
            data = json.loads(raw)
            print(
                f"[SimulationManager] ✅ LLM selected {len(data.get('models', []))} simulation models"
            )

            config = SimulationConfig(
                device_name=data.get("device_name", device_name),
                duration=data.get("duration", 10.0),
                time_steps=data.get("time_steps", 500),
                models=data.get("models", []),
            )

            # Ensure at least leakage current for safety
            model_types = [m["type"] for m in config.models]
            if "leakage_current" not in model_types:
                config.models.append(
                    {
                        "type": "leakage_current",
                        "name": "patient_safety",
                        "params": {"base_leakage_ua": 8.0, "safety_limit_ua": 100.0},
                    }
                )

            return config

        except Exception as e:
            print(f"[SimulationManager] ❌ LLM config error: {e} — using defaults")
            return self._default_config(device_name, [])

    def _default_config(self, device_name: str, parameters: list) -> SimulationConfig:
        """Fallback: default simulation config for a generic medical device."""
        return SimulationConfig(
            device_name=device_name,
            duration=60.0,
            time_steps=500,
            models=[
                {
                    "type": "battery_discharge",
                    "name": "main_battery",
                    "params": {
                        "nominal_voltage": 3.7,
                        "capacity_ah": 2.0,
                        "load_current": 0.3,
                        "internal_resistance": 0.05,
                    },
                },
                {
                    "type": "thermal",
                    "name": "device_thermal",
                    "params": {
                        "ambient_temp": 25.0,
                        "power_watts": 1.5,
                        "thermal_mass": 40.0,
                        "max_safe_temp": 42.0,
                    },
                },
                {
                    "type": "leakage_current",
                    "name": "patient_safety",
                    "params": {"base_leakage_ua": 8.0, "safety_limit_ua": 100.0},
                },
            ],
        )

    def _save_results(self, device_name: str, result: SimulationResult) -> str:
        """Save simulation results as CSV."""
        import csv

        clean_name = device_name.replace(" ", "_").lower()
        result_dir = os.path.join(self.sim_repo_path, "results")
        os.makedirs(result_dir, exist_ok=True)
        result_path = os.path.join(result_dir, f"{clean_name}_sim.csv")

        # Build CSV with time + all channels
        with open(result_path, "w", newline="") as f:
            channel_names = list(result.channels.keys())
            writer = csv.writer(f, delimiter=";")
            writer.writerow(["time"] + channel_names)

            for i, t in enumerate(result.time_array):
                row = [round(t, 6)]
                for ch in channel_names:
                    vals = result.channels[ch]["values"]
                    row.append(round(vals[i], 6) if i < len(vals) else 0)
                writer.writerow(row)

        print(f"[SimulationManager] 💾 Results saved: {result_path}")
        return result_path
