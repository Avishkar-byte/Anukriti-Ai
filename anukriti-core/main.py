import sys
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

import time
import math
import traceback
import uuid
from typing import Any, Dict, List

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

load_dotenv()

from core.compliance.engine import ComplianceEngine
from core.graph.builder import GraphBuilder
from core.requirements.engine import RequirementEngine
from core.requirements.models import RequirementPackage
from core.runtime.server import router as runtime_router
from core.runtime.traceability import TraceabilityEngine
from core.simulation.manager import SimulationManager
from core.training.pipeline import TrainingPipeline
from core.viz.bridge import router as viz_router
from core.viz.model_generator import DeviceModelGenerator

def _clean_for_json(obj):
    """Recursively replace NaN/Inf floats with None for JSON-safe serialization."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, dict):
        return {k: _clean_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_clean_for_json(v) for v in obj]
    # Handle numpy float types (float32, float64, etc.)
    try:
        if hasattr(obj, '__float__') and type(obj).__module__ == 'numpy':
            f = float(obj)
            return None if (math.isnan(f) or math.isinf(f)) else f
    except Exception:
        pass
    return obj


def safe_json_dumps(obj) -> str:
    """Clean NaN/Inf and serialize to valid JSON string."""
    cleaned = _clean_for_json(obj)
    return json.dumps(cleaned)


app = FastAPI(
    title="Anukriti AI Core",
    description="Orchestration Layer for Medical Device Digital Twins",
    version="1.0.0",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize Core Services
req_engine = RequirementEngine()
graph_builder = GraphBuilder()
sim_manager = SimulationManager()
training_pipeline = TrainingPipeline()
trace_engine = TraceabilityEngine()
model_3d_gen = DeviceModelGenerator()
compliance_engine = ComplianceEngine()

# ──────────────────────────────────────────
# In-memory Project Store
# ──────────────────────────────────────────
projects: Dict[str, Dict[str, Any]] = {}


class ProjectCreate(BaseModel):
    name: str
    device_description: str


class ProjectRequest(BaseModel):
    project_id: str
    device_name: str
    user_intent: str


class WhatIfRequest(BaseModel):
    project_id: str
    device_name: str
    requirements: List[Dict[str, Any]]
    overrides: Dict[str, Any]


# Include Routers
app.include_router(runtime_router)
app.include_router(viz_router)


@app.get("/")
async def root():
    return {"message": "Anukriti AI Core System Operational", "status": "active"}


# ──────────────────────────────────────────
# Project Management Endpoints
# ──────────────────────────────────────────
@app.post("/projects/create")
async def create_project(req: ProjectCreate):
    """Create a new project with a name and device description."""
    project_id = f"PROJ-{uuid.uuid4().hex[:6].upper()}"
    projects[project_id] = {
        "project_id": project_id,
        "name": req.name,
        "device_description": req.device_description,
        "created_at": time.time(),
        "requirements": None,
        "graph": None,
        "simulation": None,
        "twin": None,
        "status": "created",
    }
    return projects[project_id]


def sanitize_floats(obj: Any) -> Any:
    """Recursively clean out NaN and Infinity floats to prevent JSONResponse 500 errors."""
    if isinstance(obj, dict):
        return {k: sanitize_floats(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_floats(v) for v in obj]
    elif hasattr(obj, "dict") and callable(getattr(obj, "dict")):
        try:
            return {k: sanitize_floats(v) for k, v in obj.dict().items()}
        except Exception:
            pass
    elif hasattr(obj, "model_dump") and callable(getattr(obj, "model_dump")):
        try:
            return {k: sanitize_floats(v) for k, v in obj.model_dump().items()}
        except Exception:
            pass
    else:
        try:
            # Catch standard floats and numpy floats
            if type(obj) in (float,) or type(obj).__name__ in ('float32', 'float64'):
                if math.isnan(obj) or math.isinf(obj):
                    return str(obj)
                return float(obj)
        except Exception:
            pass
        return obj

def _safe_project_summary(p: dict) -> dict:
    """Strip heavy channel data for responses."""
    summary = dict(p)
    if summary.get("simulation") and isinstance(summary["simulation"], dict):
        sim = summary["simulation"]
        summary["simulation"] = {
            "status": sim.get("status", "completed"),
            "duration_seconds": sim.get("duration_seconds", 0),
            "models_run": sim.get("models_run", 0),
            "metrics": sim.get("metrics", {}),
            "warnings": sim.get("warnings", []),
            "channel_names": list(sim.get("channels", {}).keys()),
        }
    # Drop heavy graph and twin data to keep response small
    summary.pop("graph", None)
    summary.pop("twin", None)
    return sanitize_floats(summary)


@app.get("/projects")
async def list_projects():
    """List all projects (without heavy sim data)."""
    try:
        result = [_safe_project_summary(p) for p in projects.values()]
        safe_json = safe_json_dumps(result)
        return Response(content=safe_json, media_type="application/json")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, str(e))


@app.get("/projects/{project_id}")
async def get_project(project_id: str):
    """Get a specific project's full state."""
    if project_id not in projects:
        raise HTTPException(404, "Project not found")
    try:
        safe_json = safe_json_dumps(sanitize_floats(projects[project_id]))
        return Response(content=safe_json, media_type="application/json")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, str(e))


@app.get("/debug-projects")
async def debug_projects():
    """Debug endpoint: returns plain text traceback showing exactly what fails during project serialization."""
    import io
    output_lines = ["=== DEBUG PROJECTS ==="]
    output_lines.append(f"Total projects in store: {len(projects)}")
    for pid, p in projects.items():
        output_lines.append(f"\n--- Project {pid} ---")
        for key, val in p.items():
            try:
                cleaned = _clean_for_json(val)
                json.dumps(cleaned)
                output_lines.append(f"  {key}: OK")
            except Exception as e:
                output_lines.append(f"  {key}: FAILED - {e}")
                output_lines.append(f"    type: {type(val)}")
                output_lines.append(f"    value[:200]: {str(val)[:200]}")
    return Response(content="\n".join(output_lines), media_type="text/plain")


@app.delete("/admin/clear-projects")
async def clear_projects():
    """Admin: clear all in-memory projects (flushes corrupted NaN state)."""
    count = len(projects)
    projects.clear()
    return {"cleared": count, "status": "ok"}


# ──────────────────────────────────────────
# Workflow Endpoints (now with project store)
# ──────────────────────────────────────────
@app.post("/workflow/generate-requirements")
async def generate_requirements(request: ProjectRequest):
    """Step 1: Parse intent -> Structured Requirements (LLM)"""
    req_package = req_engine.generate_requirements(request.user_intent)
    req_package.project_id = request.project_id
    req_package.device_name = request.device_name

    # Save to project store if project exists
    if request.project_id in projects:
        projects[request.project_id]["requirements"] = req_package.dict()
        projects[request.project_id]["status"] = "requirements_generated"

    return req_package


@app.post("/workflow/check-compliance")
async def check_compliance(req_package: RequirementPackage):
    """Step 1.5: Verify Requirements against ISO/IEC Standards (LLM)"""
    report = compliance_engine.assess_compliance(req_package)

    if req_package.project_id in projects:
        projects[req_package.project_id]["compliance"] = report.dict()

    return report


@app.post("/workflow/build-graph")
async def build_graph(req_package: RequirementPackage):
    """Step 2: Structured Requirements -> System Graph (LLM)"""
    graph = graph_builder.build_from_requirements(req_package)

    # Update Traceability
    for node in graph.nodes:
        for req_id in node.trace_req_ids:
            trace_engine.add_link(req_id, node.id, "implemented_by")

    graph_data = graph.dict()

    # Save to project store if project exists
    if req_package.project_id in projects:
        projects[req_package.project_id]["graph"] = graph_data
        projects[req_package.project_id]["status"] = "architecture_built"

    return graph_data


@app.post("/workflow/simulate-whatif")
async def run_whatif_simulation(request: WhatIfRequest):
    """Run physics simulation with forced stress/failure parameters injected into the LLM."""
    sim_config = {
        "device_name": request.device_name,
        "requirements": request.requirements,
        "parameters": [],
    }
    sim_result = await sim_manager.run_simulation(
        sim_config, overrides=request.overrides
    )
    return sim_result


@app.post("/workflow/simulate")
async def run_simulation(req_package: RequirementPackage):
    """Step 3: Run physics simulation based on requirements (LLM + numpy)."""
    # Build config for simulation manager
    sim_config = {
        "device_name": req_package.device_name,
        "requirements": [r.dict() for r in req_package.requirements],
        "parameters": [],
    }

    # Extract parameters from constraints
    for req in req_package.requirements:
        for c in req.constraints:
            if c.unit:
                sim_config["parameters"].append(c.description.replace(" ", "_").lower())

    sim_result = await sim_manager.run_simulation(sim_config)

    # Save to project store
    if req_package.project_id in projects:
        projects[req_package.project_id]["simulation"] = sim_result
        projects[req_package.project_id]["status"] = "simulated"

    return sim_result


@app.post("/workflow/train-twin")
async def train_twin(
    req_package: RequirementPackage, background_tasks: BackgroundTasks
):
    """Step 4: Requirements -> Simulation -> Training -> Digital Twin"""
    # Run simulation first if not already done
    sim_config = {
        "device_name": req_package.device_name,
        "requirements": [r.dict() for r in req_package.requirements],
        "parameters": [],
    }
    for req in req_package.requirements:
        for c in req.constraints:
            if c.unit:
                sim_config["parameters"].append(c.description.replace(" ", "_").lower())

    sim_result = await sim_manager.run_simulation(sim_config)

    # Run training pipeline
    try:
        print(
            f"[API] Calling train_digital_twin with req_package: {req_package.dict()}"
        )
        result = await training_pipeline.train_digital_twin(req_package)
    except Exception as e:
        import traceback

        traceback.print_exc()
        print(f"[API] Critical failure in train_digital_twin: {e}")
        return {
            "status": "failed",
            "error": str(e),
            "pipeline_log": [
                "Critical failure during compilation. Check telemetry logs."
            ],
        }

    # Merge simulation metrics into result
    result["simulation_metrics"] = sim_result.get("metrics", {})
    result["simulation_channels"] = list(sim_result.get("channels", {}).keys())
    result["simulation_warnings"] = sim_result.get("warnings", [])
    result["models_simulated"] = sim_result.get("models_run", 0)

    # Save to project store
    if req_package.project_id in projects:
        projects[req_package.project_id]["simulation"] = sim_result
        projects[req_package.project_id]["twin"] = result
        projects[req_package.project_id]["status"] = "twin_trained"

    return result


@app.post("/workflow/generate-3d-model")
async def generate_3d_model(req_package: RequirementPackage):
    """Generate a 3D device model from architecture graph using LLM."""
    # Get graph data from project store
    graph_data = None
    if req_package.project_id in projects:
        graph_data = projects[req_package.project_id].get("graph")

    components = graph_data.get("nodes", []) if graph_data else []
    edges = graph_data.get("edges", []) if graph_data else []

    model_spec = model_3d_gen.generate(req_package.device_name, components, edges)

    # Save to project store
    if req_package.project_id in projects:
        projects[req_package.project_id]["model_3d"] = model_spec

    return model_spec


@app.get("/system/traceability/{req_id}")
async def get_traceability(req_id: str):
    return trace_engine.get_full_trace(req_id)


@app.get("/system/stats")
async def get_stats():
    """Dashboard stats."""
    total = len(projects)
    total_reqs = sum(
        len(p.get("requirements", {}).get("requirements", []))
        for p in projects.values()
        if p.get("requirements")
    )
    sims_run = sum(1 for p in projects.values() if p.get("simulation"))
    twins_active = sum(1 for p in projects.values() if p.get("twin"))

    return {
        "active_projects": total,
        "total_requirements": total_reqs,
        "simulations_run": sims_run,
        "active_twins": twins_active,
    }


if __name__ == "__main__":
    import os

    import uvicorn

    port = int(os.environ.get("PORT", 8003))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
