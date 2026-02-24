import json
import logging
import os
from typing import List

from groq import Groq
from pydantic import BaseModel, Field

from core.requirements.models import RequirementPackage

# Configure logger
logger = logging.getLogger("ComplianceEngine")
logger.setLevel(logging.INFO)


class ComplianceIssue(BaseModel):
    requirement_id: str = Field(
        ..., description="ID of the requirement or 'SYSTEM' if general"
    )
    severity: str = Field(..., description="High, Medium, or Low")
    description: str = Field(..., description="Description of the compliance gap")
    applicable_standard: str = Field(..., description="e.g. IEC 60601-1, ISO 13485")
    recommendation: str = Field(..., description="Actionable advice to fix")


class ComplianceReport(BaseModel):
    compliance_score: int = Field(..., description="0-100 overall score")
    issues: List[ComplianceIssue] = Field(default_factory=list)
    summary: str = Field(..., description="Executive summary of compliance status")


class ComplianceEngine:
    def __init__(self):
        # We ensure GROQ_API_KEY is available
        self.api_key = os.getenv("GROQ_API_KEY")
        if not self.api_key:
            logger.warning(
                "GROQ_API_KEY not found. Compliance engine will fail if called."
            )
        else:
            self.client = Groq(api_key=self.api_key)
        self.model = "llama-3.1-8b-instant"

    def assess_compliance(self, req_package: RequirementPackage) -> ComplianceReport:
        """
        Calls Groq to assess the generated requirements against medical device standards.
        """
        system_prompt = f"""
        You are a Senior Regulatory Affairs Specialist for Medical Devices.
        Your job is to audit system requirements against standards like IEC 60601 (Electrical Safety)
        and ISO 13485 (Quality Management).
        
        Analyze the following RequirementPackage for the device "{req_package.device_name}".
        Identify any missing critical safety constraints, ambiguous specifications, or regulatory risks.
        
        Respond ONLY with a raw JSON object adhering to the following schema:
        {{
            "compliance_score": int (0-100),
            "summary": "String summarizing the regulatory readiness",
            "issues": [
                {{
                    "requirement_id": "REQ-123 or SYSTEM",
                    "severity": "High|Medium|Low",
                    "description": "...",
                    "applicable_standard": "...",
                    "recommendation": "..."
                }}
            ]
        }}
        Do not include markdown blocks or any other text outside the JSON.
        """

        # Serialize requirements to string
        reqs_data = json.dumps([r.dict() for r in req_package.requirements], indent=2)

        user_prompt = f"Assess the following requirements:\n{reqs_data}"

        try:
            logger.info("🧠 Calling Groq for Compliance Assessment...")
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                model=self.model,
                temperature=0.1,  # Low temp for analytical consistency
                max_tokens=2048,
            )

            response_content = chat_completion.choices[0].message.content.strip()
            # Clean up potential markdown formatting from LLM
            if response_content.startswith("```json"):
                response_content = response_content[7:]
            if response_content.startswith("```"):
                response_content = response_content[3:]
            if response_content.endswith("```"):
                response_content = response_content[:-3]

            response_content = response_content.strip()

            data = json.loads(response_content)
            logger.info(
                f"✅ Compliance Assessment Complete. Score: {data.get('compliance_score')}"
            )

            return ComplianceReport(**data)

        except Exception as e:
            logger.error(f"Failed to assess compliance: {str(e)}")
            # Fallback report on error
            return ComplianceReport(
                compliance_score=0,
                summary=f"Analysis failed due to LLM error: {str(e)}",
                issues=[
                    ComplianceIssue(
                        requirement_id="SYSTEM",
                        severity="High",
                        description="Could not complete compliance audit.",
                        applicable_standard="N/A",
                        recommendation="Check API keys and LLM service.",
                    )
                ],
            )
