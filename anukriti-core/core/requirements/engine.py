import json
import os
import uuid
from typing import List

from dotenv import load_dotenv
from groq import Groq

from .models import (
    Constraint,
    Requirement,
    RequirementCategory,
    RequirementPackage,
    SafetyClass,
)

# Load environment variables from .env file
load_dotenv()

# ─────────────────────────────────────────────
# System Prompt — tells the LLM exactly what
# structured JSON to produce
# ─────────────────────────────────────────────
SYSTEM_PROMPT = """You are an expert medical device systems engineer specializing in regulatory-grade requirement engineering (ISO 13485, IEC 62304, ISO 60601).

Given a user's natural language description of a medical device, extract and generate a list of structured engineering requirements in strict JSON format.

RULES:
- Generate between 5 and 10 requirements
- Each requirement MUST have: id, description, category, safety_class, constraints, source_document
- id format: PREFIX-XXXX where PREFIX is one of [SYS, SAF, HW, SW, ELEC] and XXXX is a 4-char hex
- category must be one of: "System", "Hardware", "Software", "Electrical", "Safety"
- safety_class must be one of: "A", "B", "C" (C = highest risk)
- constraints is a list of objects with: description, value (number or null), unit (string or null), tolerance (number or null)
- source_document should reference the relevant standard (e.g. ISO_60601-1, IEC_62304, User_Intent)
- Be specific with numerical values in constraints (voltages, currents, temperatures, timings, etc.)

OUTPUT FORMAT (respond with ONLY valid JSON, no explanation, no markdown):
{
  "requirements": [
    {
      "id": "SYS-A1B2",
      "description": "The system shall ...",
      "category": "System",
      "safety_class": "B",
      "constraints": [
        {"description": "Battery Life", "value": 72.0, "unit": "hours", "tolerance": null}
      ],
      "source_document": "User_Intent"
    }
  ]
}"""


class RequirementEngine:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        self.model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
        self.llm_enabled = False

        if not api_key or api_key == "your_groq_api_key_here":
            print(
                "[RequirementEngine] ⚠️  GROQ_API_KEY not set — falling back to mock mode."
            )
        else:
            try:
                self.client = Groq(api_key=api_key)
                self.llm_enabled = True
                print(f"[RequirementEngine] ✅ Groq LLM ready — model: {self.model}")
            except Exception as e:
                print(f"[RequirementEngine] ❌ Failed to init Groq client: {e}")

    def generate_requirements(self, project_context: str) -> RequirementPackage:
        """
        Generate structured engineering requirements from natural language intent.
        Uses Groq LLM if API key is configured, otherwise falls back to mock data.
        """
        if self.llm_enabled:
            return self._generate_with_llm(project_context)
        else:
            return self._generate_mock(project_context)

    def _generate_with_llm(self, project_context: str) -> RequirementPackage:
        """Call Groq API and parse the structured JSON response."""
        try:
            print(f"[RequirementEngine] 🧠 Calling Groq ({self.model})...")

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": f"Generate requirements for this medical device:\n\n{project_context}",
                    },
                ],
                temperature=0.3,  # Low temp = more consistent, structured output
                max_tokens=2048,
                response_format={"type": "json_object"},  # Force JSON output
            )

            raw = response.choices[0].message.content
            print(f"[RequirementEngine] ✅ LLM responded ({len(raw)} chars)")

            data = json.loads(raw)
            requirements = self._parse_requirements(data.get("requirements", []))

            return RequirementPackage(
                project_id="LLM-GEN",
                device_name="Medical Device",
                requirements=requirements,
            )

        except json.JSONDecodeError as e:
            print(
                f"[RequirementEngine] ❌ JSON parse error: {e} — falling back to mock"
            )
            return self._generate_mock(project_context)
        except Exception as e:
            print(f"[RequirementEngine] ❌ Groq API error: {e} — falling back to mock")
            return self._generate_mock(project_context)

    def _parse_requirements(self, raw_reqs: list) -> List[Requirement]:
        """Parse raw LLM JSON into typed Requirement models."""
        requirements = []
        for r in raw_reqs:
            try:
                # Safely map category and safety class
                category = RequirementCategory(r.get("category", "System"))
                safety_class = SafetyClass(r.get("safety_class", "B"))

                # Parse constraints
                constraints = []
                for c in r.get("constraints", []):
                    constraints.append(
                        Constraint(
                            description=c.get("description", ""),
                            value=c.get("value"),
                            unit=c.get("unit"),
                            tolerance=c.get("tolerance"),
                        )
                    )

                requirements.append(
                    Requirement(
                        id=r.get("id", f"REQ-{uuid.uuid4().hex[:4].upper()}"),
                        description=r.get("description", ""),
                        category=category,
                        safety_class=safety_class,
                        constraints=constraints,
                        source_document=r.get("source_document", "User_Intent"),
                        trace_ids=[],
                    )
                )
            except Exception as e:
                print(f"[RequirementEngine] ⚠️  Skipping malformed requirement: {e}")
                continue

        return requirements

    def _generate_mock(self, project_context: str) -> RequirementPackage:
        """Fallback mock requirements when LLM is unavailable."""
        print("[RequirementEngine] 📋 Using mock requirements (no API key)")
        reqs = [
            Requirement(
                id=f"SYS-{uuid.uuid4().hex[:4].upper()}",
                description="The system must operate continuously for 24 hours on battery.",
                category=RequirementCategory.SYSTEM,
                safety_class=SafetyClass.B,
                constraints=[
                    Constraint(description="Battery Duration", value=24.0, unit="hours")
                ],
                source_document="User_Intent",
            ),
            Requirement(
                id=f"SAF-{uuid.uuid4().hex[:4].upper()}",
                description="Leakage current must not exceed 100µA in normal condition.",
                category=RequirementCategory.SAFETY,
                safety_class=SafetyClass.C,
                constraints=[
                    Constraint(
                        description="Leakage Current",
                        value=100.0,
                        unit="uA",
                        tolerance=10.0,
                    )
                ],
                source_document="ISO_60601-1",
            ),
            Requirement(
                id=f"SW-{uuid.uuid4().hex[:4].upper()}",
                description="Software shall detect and alert on occlusion within 5 seconds.",
                category=RequirementCategory.SOFTWARE,
                safety_class=SafetyClass.C,
                constraints=[
                    Constraint(description="Alert Latency", value=5.0, unit="seconds")
                ],
                source_document="IEC_62304",
            ),
        ]
        return RequirementPackage(
            project_id="MOCK-001",
            device_name="Medical Device Prototype",
            requirements=reqs,
        )

    def _chunk_text(self, text: str, chunk_size: int = 500):
        """Utility for future RAG chunking."""
        return [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]
