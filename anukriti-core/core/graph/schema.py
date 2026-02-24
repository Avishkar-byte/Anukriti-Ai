from enum import Enum
from typing import Any, Dict, List

from pydantic import BaseModel


class NodeType(str, Enum):
    COMPONENT = "Component"
    INTERFACE = "Interface"
    CONSTRAINT = "Constraint"
    INPUT = "Input"
    OUTPUT = "Output"


class GraphNode(BaseModel):
    id: str
    type: NodeType
    label: str
    properties: Dict[str, Any] = {}
    trace_req_ids: List[str] = []


class GraphEdge(BaseModel):
    source: str
    target: str
    relation: str


class SystemGraph(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    metadata: Dict[str, Any] = {}
