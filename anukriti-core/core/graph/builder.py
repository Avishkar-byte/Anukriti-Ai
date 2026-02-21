import os
import json
import networkx as nx
from typing import List, Optional
from dotenv import load_dotenv

from ..requirements.models import RequirementPackage, Requirement
from .schema import SystemGraph, GraphNode, GraphEdge, NodeType

load_dotenv()

GRAPH_SYSTEM_PROMPT = """You are an expert medical device systems architect.
Given a list of engineering requirements for a medical device, extract the system architecture as a component graph.

RULES:
- Identify 4–8 key subsystem components (e.g., Battery, Motor Driver, MCU, Sensor Array, Communication Module, etc.)
- For each component, identify which requirements it relates to
- Define edges as relationships: "has_subsystem", "interfaces_with", "constrained_by", "powers"
- Each node has: id, type (Component, Interface, Constraint, Input, Output), label
- Each edge has: source, target, relation

OUTPUT FORMAT (respond with ONLY valid JSON, no explanation):
{
  "components": [
    {"id": "COMP_BATTERY", "type": "Component", "label": "Battery Subsystem", "related_reqs": ["SYS-1234"]},
    {"id": "COMP_MCU", "type": "Component", "label": "Main Controller", "related_reqs": ["SW-9012"]}
  ],
  "interfaces": [
    {"id": "IF_POWER", "type": "Interface", "label": "Power Bus", "related_reqs": []}
  ],
  "edges": [
    {"source": "COMP_BATTERY", "target": "IF_POWER", "relation": "powers"},
    {"source": "COMP_MCU", "target": "COMP_BATTERY", "relation": "interfaces_with"}
  ]
}"""


class GraphBuilder:
    def __init__(self):
        self.graph = nx.DiGraph()
        self.llm_enabled = False
        
        api_key = os.getenv("GROQ_API_KEY")
        model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
        
        if api_key and api_key != "your_groq_api_key_here":
            try:
                from groq import Groq
                self.client = Groq(api_key=api_key)
                self.model = model
                self.llm_enabled = True
                print(f"[GraphBuilder] ✅ LLM-powered graph builder ready")
            except Exception as e:
                print(f"[GraphBuilder] ⚠️ LLM init failed: {e}")
        else:
            print("[GraphBuilder] ⚠️ No API key — using rule-based graph builder")

    def build_from_requirements(self, package: RequirementPackage) -> SystemGraph:
        if self.llm_enabled and len(package.requirements) > 0:
            return self._build_with_llm(package)
        return self._build_rule_based(package)

    def _build_with_llm(self, package: RequirementPackage) -> SystemGraph:
        """Use LLM to intelligently extract system architecture from requirements."""
        try:
            req_text = "\n".join([
                f"- [{r.id}] ({r.category}) {r.description}" 
                for r in package.requirements
            ])
            
            prompt = f"""Device: {package.device_name}

Requirements:
{req_text}

Extract the system architecture graph for this device."""

            print(f"[GraphBuilder] 🧠 Calling LLM for architecture extraction...")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": GRAPH_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=2048,
                response_format={"type": "json_object"}
            )
            
            raw = response.choices[0].message.content
            data = json.loads(raw)
            print(f"[GraphBuilder] ✅ LLM returned {len(data.get('components', []))} components, {len(data.get('edges', []))} edges")
            
            return self._parse_llm_graph(data, package)
            
        except Exception as e:
            print(f"[GraphBuilder] ❌ LLM error: {e} — falling back to rules")
            return self._build_rule_based(package)

    def _parse_llm_graph(self, data: dict, package: RequirementPackage) -> SystemGraph:
        """Parse LLM JSON into SystemGraph."""
        nodes = []
        edges = []
        
        # Root node
        root_id = "SYS_ROOT"
        nodes.append(GraphNode(id=root_id, type=NodeType.COMPONENT, label=package.device_name))
        
        # Components
        for comp in data.get("components", []):
            node_type = NodeType.COMPONENT
            try:
                node_type = NodeType(comp.get("type", "Component"))
            except ValueError:
                pass
            
            nodes.append(GraphNode(
                id=comp["id"],
                type=node_type,
                label=comp.get("label", comp["id"]),
                trace_req_ids=comp.get("related_reqs", [])
            ))
            edges.append(GraphEdge(source=root_id, target=comp["id"], relation="has_subsystem"))
        
        # Interfaces
        for iface in data.get("interfaces", []):
            nodes.append(GraphNode(
                id=iface["id"],
                type=NodeType.INTERFACE,
                label=iface.get("label", iface["id"]),
                trace_req_ids=iface.get("related_reqs", [])
            ))
        
        # Requirement constraint nodes
        for req in package.requirements:
            req_node_id = f"REQ_{req.id}"
            nodes.append(GraphNode(
                id=req_node_id,
                type=NodeType.CONSTRAINT,
                label=f"{req.id}: {req.description[:40]}...",
                properties={"full_text": req.description, "safety_class": req.safety_class},
                trace_req_ids=[req.id]
            ))
        
        # Edges from LLM
        for edge in data.get("edges", []):
            edges.append(GraphEdge(
                source=edge["source"],
                target=edge["target"],
                relation=edge.get("relation", "connected_to")
            ))
        
        # Link components to their requirements
        for comp in data.get("components", []):
            for req_id in comp.get("related_reqs", []):
                edges.append(GraphEdge(
                    source=comp["id"],
                    target=f"REQ_{req_id}",
                    relation="satisfies"
                ))
        
        return SystemGraph(
            nodes=nodes,
            edges=edges,
            metadata={"source": "llm", "model": self.model}
        )

    def _build_rule_based(self, package: RequirementPackage) -> SystemGraph:
        """Original rule-based fallback."""
        self.graph.clear()
        
        root_id = "SYS_ROOT"
        self.graph.add_node(root_id, type=NodeType.COMPONENT, label=package.device_name)
        
        nodes = [GraphNode(id=root_id, type=NodeType.COMPONENT, label=package.device_name)]
        edges = []

        for req in package.requirements:
            req_node_id = f"REQ_{req.id}"
            self.graph.add_node(req_node_id, type=NodeType.CONSTRAINT, label=req.id)
            self.graph.add_edge(root_id, req_node_id, relation="constrained_by")
            
            nodes.append(GraphNode(
                id=req_node_id, 
                type=NodeType.CONSTRAINT, 
                label=req.description[:30] + "...",
                properties={"full_text": req.description},
                trace_req_ids=[req.id]
            ))
            edges.append(GraphEdge(source=root_id, target=req_node_id, relation="constrained_by"))
            
            if "battery" in req.description.lower():
                comp_id = "COMP_BATTERY"
                if not self.graph.has_node(comp_id):
                    self.graph.add_node(comp_id, type=NodeType.COMPONENT, label="Battery Subsystem")
                    nodes.append(GraphNode(id=comp_id, type=NodeType.COMPONENT, label="Battery Subsystem"))
                    edges.append(GraphEdge(source=root_id, target=comp_id, relation="has_subsystem"))
                edges.append(GraphEdge(source=comp_id, target=req_node_id, relation="satisfies"))
        
        return SystemGraph(
            nodes=nodes, 
            edges=edges,
            metadata={"source": "rule_based"}
        )
