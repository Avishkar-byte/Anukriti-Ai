# Anukriti AI - Generative System Engineering & Digital Twin Platform for Medical Devices

An end-to-end pipeline for translating natural language device requirements into physics-simulated, ML-surrogate digital twins.

![Next.js](https://img.shields.io/badge/Next.js-14-black.svg?style=flat-square) ![Python](https://img.shields.io/badge/python-3.9+-blue.svg?style=flat-square) ![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-teal.svg?style=flat-square) ![Docker](https://img.shields.io/badge/docker-ready-blue.svg?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square) ![LLM](https://img.shields.io/badge/LLM-Groq-orange.svg?style=flat-square)

> The development of mission-critical medical devices suffers from a severe disconnect between natural language requirements and validated device simulations. Anukriti AI addresses this disconnect through an automated, end-to-end engineering pipeline that parses abstract requirements using an LLM, constructs a Directed Acyclic Graph (DAG) topology, solves numerical physics constraints, and trains a deployable surrogate Machine Learning twin. This system enforces structural validation and produces serialized digital twins ready for downstream integration.

## Pipeline Overview

```text
Natural Language Input
      |
      v
[MeDeT Parser] - LLM + constraint extraction - safety classes, parameters, tolerances
      |
      v
[Topology Engine] - DAG construction - subsystems, interfaces, dependency graph
      |
      v
[Simulation Manager] - numerical physics solvers - Thermal / Electrical / Battery / Fluid
      |
      v
[Training Pipeline] - surrogate model training - HistGradientBoosting / MLP ensembles
      |
      v
Digital Twin Artifact (.pkl) - deployable surrogate model
```

A DAG-based topology is critical for medical device simulation. Representing subsystems as nodes and physical/data interfaces as directed edges resolves the order of operations for cascading simulations, ensures strict subsystem dependency resolution, and enables bidirectional constraint propagation across the entire device architecture prior to numerical solving.

## Core Capabilities

Capability | Technical Description
---|---
**Requirements Parsing** | LLM-driven translation of abstract natural language into structured technical specifications.
**Constraint Extraction** | Automated derivation of operational tolerances, dimensions, and safety parameters.
**Topology Synthesis** | Construction of a multi-domain Directed Acyclic Graph representing subsystem dependencies.
**Thermal Simulation** | Numerical solving of heat flux and steady-state thermal resistance.
**Electrical Leakage Simulation** | Modeling of current leakage and isolation boundary limits.
**Battery Discharge Simulation** | State-of-charge calculation across non-linear discharge cycles.
**Fluid Dynamics Simulation** | Flow rate, pressure drop, and resistance modeling for fluidic pathways.
**Surrogate Model Training** | Supervised learning using `HistGradientBoostingRegressor` and `MLPRegressor` on simulation telemetry.
**3D Topology Visualization** | Interactive Force-Directed graph rendering of the generated device architecture.
**LLM Planning Integration** | Groq-powered reasoning for requirement classification and topology logic.

## System Architecture

**MeDeT Parser** - The initial parsing layer extracts formal engineering parameters from abstract natural language input. It infers safety classifications (such as IEC 60601 class inference), dimensional constraints, operating envelopes, and regulatory flags. The parser utilizes Groq LLM integration to guarantee strictly structured JSON output for downstream processing.

**Topology Engine** - The topology engine converts the structured requirements into a Directed Acyclic Graph (DAG) where nodes represent device subsystems and directed edges represent data, power, or fluid interfaces. The structure of this DAG fundamentally drives the sequencing of all subsequent simulations. The engine also outputs a Force-Directed graph payload for interactive 2D/3D visualization in the frontend portal.

**Simulation Manager & Training Pipeline** - The simulation manager analyzes the generated DAG to select, configure, and sequence appropriate numerical physics solvers. The resulting simulation channel data is compiled into a feature matrix and passed to the training pipeline. The pipeline trains a high-speed surrogate model ensemble utilizing `HistGradientBoostingRegressor` and `MLPRegressor`, finally outputting a serialized `.pkl` artifact that acts as the deployable digital twin.

## Simulation Modules

Module | Domain | Key Parameters | Solver Approach
---|---|---|---
Thermal Analysis | Thermodynamics | Heat flux, thermal resistance, operating temp | Steady-state thermal convergence
Electrical Leakage | Electromagnetics | Current leakage, isolation impedance | Circuit nodal analysis
Battery Discharge | Energy Storage | SoC curves, discharge rate, capacity | Non-linear cycle modeling
Fluid Dynamics | Fluidics | Flow rate, pressure drop, viscosity | Steady-flow resistance networks

## Tech Stack

**Portal** - Next.js 14, React, TailwindCSS, Framer Motion, Force-Directed 3D graph rendering.

**Core API & Engine** - FastAPI, Uvicorn, Python 3.9, Groq LLM API, `scikit-learn` (`HistGradientBoostingRegressor`, `MLPRegressor`), custom numerical computing engine, `joblib` (model serialization).

## Quick Start

**Docker (Recommended)**
```bash
git clone https://github.com/Avishkar-byte/Anukriti-Ai.git
cd Anukriti-Ai
docker-compose up --build -d
```

Service | URL | Description
---|---|---
Next.js Portal | `http://localhost:3000` | Interactive web application and 3D visualization.
FastAPI Core | `http://localhost:8003` | Backend simulation orchestration engine.

**Manual (Development)**

Start the core engine:
```bash
cd anukriti-core
pip install -r requirements.txt
# Requires .env containing GROQ_API_KEY
uvicorn main:app --host 0.0.0.0 --port 8003
```

Start the portal:
```bash
cd anukriti-portal
npm install
# Requires .env.local containing NEXT_PUBLIC_API_URL=http://localhost:8003
npm run dev
```

## Configuration Reference

Variable | Service | Description
---|---|---
`GROQ_API_KEY` | Core | API key for LLM requirement parsing and topology reasoning.
`NEXT_PUBLIC_API_URL` | Portal | The endpoint address for the backend FastAPI core.
`PORT` | Core | Port configuration for Uvicorn (default: 8003).
`SIMULATION_TIMEOUT` | Core | Timeout threshold per physics solver iteration.

## API Reference

Method | Endpoint | Description
---|---|---
`POST` | `/projects/create` | Initializes a new digital twin project workspace.
`POST` | `/workflow/generate-requirements` | LLM extraction of requirements from user intent.
`POST` | `/workflow/build-graph` | Synthesis of the DAG topology from structured requirements.
`POST` | `/workflow/simulate` | Execution of physics solvers based on the DAG dependencies.
`POST` | `/workflow/train-twin` | Training and serialization of the surrogate ML model.
`GET`  | `/projects/{project_id}` | Retrieval of a project's state and twin artifacts.

## Roadmap

- [x] LLM requirements parsing
- [x] DAG topology engine
- [x] Four physics simulation modules
- [x] Surrogate ML twin training
- [x] Docker deployment
- [x] 3D interactive visualization
- [ ] FDA 21 CFR Part 11 audit trail integration
- [ ] Real-time simulation streaming via WebSocket
- [ ] Multi-device comparative twin analysis
- [ ] ONNX export for surrogate models
- [ ] Cloud-native deployment (Render / AWS)
- [ ] CI pipeline with simulation regression tests

## License

This project is licensed under the [MIT License](LICENSE).
