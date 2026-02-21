from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from enum import Enum

class RequirementCategory(str, Enum):
    SYSTEM = "System"
    HARDWARE = "Hardware"
    SOFTWARE = "Software"
    ELECTRICAL = "Electrical"
    SAFETY = "Safety"

class SafetyClass(str, Enum):
    A = "A"
    B = "B"
    C = "C"

class Constraint(BaseModel):
    description: str
    value: Optional[float] = None
    unit: Optional[str] = None
    tolerance: Optional[float] = None

class Requirement(BaseModel):
    id: str = Field(..., description="Unique Requirement ID")
    description: str
    category: RequirementCategory
    safety_class: SafetyClass
    constraints: List[Constraint] = []
    source_document: str = Field(..., description="Source file/standard")
    trace_ids: List[str] = Field(default_factory=list, description="Upstream/Downstream trace IDs")

class RequirementPackage(BaseModel):
    project_id: str
    device_name: str
    requirements: List[Requirement]
