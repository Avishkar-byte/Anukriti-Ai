import sys
import os

# Add current dir to path
sys.path.append(os.getcwd())

print("Checking imports...")
try:
    from main import app
    from core.requirements.engine import RequirementEngine
    from core.graph.builder import GraphBuilder
    from core.simulation.manager import SimulationManager
    from core.training.pipeline import TrainingPipeline
    from core.runtime.server import router as runtime_router
    from core.viz.bridge import router as viz_router
    print("All imports successful!")
except ImportError as e:
    print(f"Import Error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
