from typing import Dict, List

from pydantic import BaseModel


class TraceLink(BaseModel):
    source_id: str  # e.g., REQ-001
    target_id: str  # e.g., COMP-BATTERY
    type: str  # e.g., "satisfies", "verifies"


class TraceabilityEngine:
    def __init__(self):
        self.links: List[TraceLink] = []

    def add_link(self, source: str, target: str, type: str):
        self.links.append(TraceLink(source_id=source, target_id=target, type=type))

    def get_full_trace(self, req_id: str) -> Dict[str, List[str]]:
        """
        Return downstream items linked to this requirement.
        """
        downstream = [link.target_id for link in self.links if link.source_id == req_id]
        return {
            "req_id": req_id,
            "downstream_components": downstream,
            # Recursive check could go here
        }

    def export_rtm(self) -> str:
        """
        Export Requirement Traceability Matrix as CSV.
        """
        csv = "Requirement ID,Target ID,Relationship\n"
        for link in self.links:
            csv += f"{link.source_id},{link.target_id},{link.type}\n"
        return csv
