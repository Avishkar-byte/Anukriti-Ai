"""
LLM-powered 3D Device Model Generator.
Takes architecture graph → asks LLM to design a 3D layout → returns structured JSON.
"""

import os
import json
from typing import Dict, Any, List, Optional

MODEL_3D_PROMPT = """You are a 3D CAD engineer designing schematic cutaway models of medical devices.
Given a device name and its architecture components, generate a 3D model specification.

Each component becomes a 3D primitive with position, size, color, and optional label.

AVAILABLE SHAPES:
- "box" — params: width, height, depth
- "cylinder" — params: radiusTop, radiusBottom, height, segments (default 16)
- "sphere" — params: radius, segments (default 16)
- "cone" — params: radius, height, segments (default 16)
- "torus" — params: radius, tube (tube radius), segments (default 16)
- "plane" — params: width, height (flat rectangle, good for screens/displays)
- "capsule" — params: radius, length

RULES:
1. Position components logically inside a device housing
2. Use Y-axis as vertical (Y=0 is center). Positive Y is up.
3. Keep the model centered at origin (0,0,0)
4. Total device size should fit within a 10x10x10 unit bounding box
5. Add a semi-transparent "housing" as the outermost shell
6. Color components by function:
   - Power/Battery: #4ade80 (green)
   - Processing/MCU/Controller: #60a5fa (blue)
   - Sensors: #f59e0b (amber)
   - Display/UI: #06b6d4 (cyan)
   - Motors/Actuators/Pumps: #a78bfa (purple)
   - Communication/Wireless: #ec4899 (pink)
   - Safety/Protection: #ef4444 (red)
   - Fluid/Tubing: #2dd4bf (teal)
   - Housing/Structure: #ffffff with opacity 0.12
   - Connectors/Ports: #9ca3af (gray)
7. Add connection lines between related components
8. Make it look like a real engineering cutaway diagram
9. Include 8-20 parts for a detailed model

OUTPUT FORMAT (respond with ONLY valid JSON, no explanation):
{
  "device_name": "Insulin Pump",
  "bounding_box": [8, 12, 4],
  "parts": [
    {
      "id": "housing",
      "label": "Device Housing",
      "shape": "box",
      "params": {"width": 8, "height": 12, "depth": 4},
      "position": [0, 0, 0],
      "rotation": [0, 0, 0],
      "color": "#ffffff",
      "opacity": 0.12,
      "metalness": 0.3
    },
    {
      "id": "battery",
      "label": "Li-ion Battery",
      "shape": "box",
      "params": {"width": 3, "height": 1.5, "depth": 2.5},
      "position": [0, -4, 0],
      "rotation": [0, 0, 0],
      "color": "#4ade80",
      "opacity": 1.0,
      "metalness": 0.5
    }
  ],
  "connections": [
    {"from": "battery", "to": "mcu", "color": "#4ade80", "label": "Power"},
    {"from": "mcu", "to": "motor", "color": "#60a5fa", "label": "Control"}
  ]
}"""


class DeviceModelGenerator:
    def __init__(self):
        self.llm_enabled = False
        api_key = os.getenv("GROQ_API_KEY")
        model_name = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

        if api_key and api_key != "your_groq_api_key_here":
            try:
                from groq import Groq
                self.client = Groq(api_key=api_key)
                self.model = model_name
                self.llm_enabled = True
                print("[3DModelGen] ✅ LLM-powered 3D model generator ready")
            except Exception as e:
                print("[3DModelGen] ⚠️ LLM init failed: %s" % e)
        else:
            print("[3DModelGen] ⚠️ No API key — using fallback 3D model")

    def generate(self, device_name: str, components: List[Dict], edges: List[Dict]) -> Dict[str, Any]:
        """Generate 3D model spec from architecture graph."""
        if self.llm_enabled:
            return self._generate_with_llm(device_name, components, edges)
        return self._fallback_model(device_name, components)

    def _generate_with_llm(self, device_name: str, components: List[Dict], edges: List[Dict]) -> Dict[str, Any]:
        try:
            comp_text = "\n".join([
                "- %s (type: %s, properties: %s)" % (
                    c.get("label", c.get("id", "?")),
                    c.get("type", "Component"),
                    json.dumps(c.get("properties", {}))
                )
                for c in components
            ])

            edge_text = "\n".join([
                "- %s → %s (relation: %s)" % (
                    e.get("source", ""),
                    e.get("target", ""),
                    e.get("relation", "connected_to")
                )
                for e in edges[:20]  # Limit to prevent token overflow
            ])

            prompt = """Device: %s

Architecture Components:
%s

Connections:
%s

Generate a detailed 3D cutaway model specification for this device.""" % (device_name, comp_text, edge_text)

            print("[3DModelGen] 🧠 Calling LLM for 3D model generation...")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": MODEL_3D_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=3000,
                response_format={"type": "json_object"}
            )

            raw = response.choices[0].message.content
            data = json.loads(raw)

            n_parts = len(data.get("parts", []))
            n_connections = len(data.get("connections", []))
            print("[3DModelGen] ✅ Generated: %d parts, %d connections" % (n_parts, n_connections))

            # Validate and sanitize
            data = self._sanitize(data, device_name)
            return data

        except Exception as e:
            print("[3DModelGen] ❌ LLM error: %s — using fallback" % e)
            return self._fallback_model(device_name, components)

    def _sanitize(self, data: Dict, device_name: str) -> Dict:
        """Ensure valid 3D spec."""
        data.setdefault("device_name", device_name)
        data.setdefault("bounding_box", [8, 10, 4])
        data.setdefault("parts", [])
        data.setdefault("connections", [])

        valid_shapes = {"box", "cylinder", "sphere", "cone", "torus", "plane", "capsule"}

        for part in data["parts"]:
            part.setdefault("id", "part_%d" % data["parts"].index(part))
            part.setdefault("label", part["id"])
            if part.get("shape") not in valid_shapes:
                part["shape"] = "box"
            part.setdefault("position", [0, 0, 0])
            part.setdefault("rotation", [0, 0, 0])
            part.setdefault("color", "#6b7280")
            part.setdefault("opacity", 1.0)
            part.setdefault("params", {"width": 1, "height": 1, "depth": 1})

        return data

    def _fallback_model(self, device_name: str, components: List[Dict]) -> Dict:
        """Generate a basic model without LLM."""
        parts = [{
            "id": "housing",
            "label": "%s Housing" % device_name,
            "shape": "box",
            "params": {"width": 6, "height": 8, "depth": 3},
            "position": [0, 0, 0],
            "rotation": [0, 0, 0],
            "color": "#ffffff",
            "opacity": 0.1,
            "metalness": 0.3,
        }]

        y_offset = -3
        for i, comp in enumerate(components[:10]):
            label = comp.get("label", comp.get("id", "Part %d" % i))
            comp_type = comp.get("type", "").lower()

            if "battery" in label.lower() or "power" in label.lower():
                color = "#4ade80"
            elif "sensor" in label.lower():
                color = "#f59e0b"
            elif "display" in label.lower() or "screen" in label.lower():
                color = "#06b6d4"
            elif "motor" in label.lower() or "pump" in label.lower() or "actuator" in label.lower():
                color = "#a78bfa"
            elif "wireless" in label.lower() or "bluetooth" in label.lower() or "comm" in label.lower():
                color = "#ec4899"
            else:
                color = "#60a5fa"

            col = (i % 2) * 2 - 1  # -1 or 1
            parts.append({
                "id": comp.get("id", "comp_%d" % i),
                "label": label,
                "shape": "box",
                "params": {"width": 2, "height": 1.2, "depth": 1.5},
                "position": [col * 1.2, y_offset, 0],
                "rotation": [0, 0, 0],
                "color": color,
                "opacity": 0.9,
            })
            if i % 2 == 1:
                y_offset += 2

        return {
            "device_name": device_name,
            "bounding_box": [6, 8, 3],
            "parts": parts,
            "connections": [],
        }
