# Anukriti Core - System Engineering Platform

## Overview
`anukriti-core` is the central orchestration layer for the Anukriti AI ecosystem. It bridges Requirement Intelligence (RAG), System Simulation (Qucs), and Digital Twin Training (MeDeT) into a unified platform.

## Architecture
The system is built on **FastAPI** and follows a modular microservice-like architecture:

1.  **Requirement Engine**: Uses RAG (FAISS + SentenceTransformers) to parse intent into structured JSON.
2.  **System Graph Builder**: Converts requirements into a Directed Acyclic Graph (DAG) for tracing.
3.  **Simulation Orchestrator**: Manages `anukriti-sim` execution.
4.  **Training Pipeline**: Prepares data and triggers `MeDeT` Meta-Learning.
5.  **Runtime Server**: Serves the trained Digital Twin for inference.
6.  **3D Bridge**: WebSocket interface for real-time visualization.

## Modules

- `core/requirements`: AI-driven requirement extraction.
- `core/graph`: System graph generation.
- `core/simulation`: Simulation wrapping and execution.
- `core/training`: Digital Twin training pipeline.
- `core/runtime`: Inference and telemetry API.
- `adapters/`: Data converters between subsystems.

## Setup

### Prerequisites
- Python 3.9+
- Docker & Docker Compose (optional but recommended)

### Installation
```bash
cd anukriti-core
pip install -r requirements.txt
```

### Running the Server
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

- `POST /workflow/generate-requirements`: Intent to Requirements.
- `POST /workflow/build-graph`: Requirements to Graph.
- `POST /workflow/train-twin`: Full Training Loop.
- `GET /runtime/telemetry/{id}`: Live DT Telemetry.

## Docker Deployment

To run the full stack including UI:
```bash
docker-compose up --build
```
