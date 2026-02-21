# Anukriti AI 🧬🖥️

**The End-to-End Generative System Engineering & Digital Twin Platform for Medical Devices.**

[![Next.js Platform](https://img.shields.io/badge/Frontend-Next.js_14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI Core](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![LLM Simulation Engine](https://img.shields.io/badge/LLM-Groq_%7C_Llama_3-F55036?style=for-the-badge)](https://groq.com)
[![Docker Ready](https://img.shields.io/badge/Deploy-Docker_Compose-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)

Anukriti AI is a revolutionary platform designed to accelerate the development, simulation, and validation of mission-critical medical devices. By combining Large Language Models (LLMs) with numerical physics engines and interactive 3D topology generation, Anukriti bridges the gap between raw engineering requirements and functional digital twins.

## ✨ Features

*   **Intelligent Requirements Engineering**: Parse abstract user intents into formal engineering requirements and strict multi-disciplinary constraints.
*   **Generative Architecture Graphs**: Automatically synthesize interactive 2D/3D component topologies and system graphs based on generated constraints.
*   **LLM-Powered Physics Simulation**: Dynamically spin up numerical physics models (Thermal, Electrical Leakage, Battery Discharge, Fluid Dynamics) customized to the device's specific architecture.
*   **Surrogate ML Twin Training**: Train ultra-fast gradient boosting and MLP ensembles directly on the simulated physical data, creating a lightweight surrogate Digital Twin ready for deployment.
*   **Fully Containerized**: Optimized multi-stage Docker builds for the Next.js portal and FastAPI numerical core.

## 🚀 Quick Start (Docker)

Anukriti is optimized for seamless deployment.

```bash
# Clone the repository
git clone https://github.com/Avishkar-byte/Anukriti-Ai.git
cd Anukriti-Ai

# Start the platform
docker-compose up --build -d
```

The portal will be available at `http://localhost:3000` and the core backend API at `http://localhost:8003`.

## 🛠️ Tech Stack

*   **Portal**: Next.js 14, React, TailwindCSS, Framer Motion, Force-Directed 3D Graphs.
*   **Core API**: FastAPI, Uvicorn, Python 3.9
*   **Simulation Engine**: Custom Numerical Computing Engine integrated with Groq LLM planning.
*   **Twin Models**: Scikit-Learn (HistGradientBoostingRegressor, MLPRegressor).

## 🧠 System Architecture

1.  **MeDeT (Medical Device Twin) Parser**: Extracts safety classes, parameters, and hierarchical constraints from natural language.
2.  **Topology Engine**: Constructs a directed acyclic graph (DAG) representing the device's subsystems and their interfaces.
3.  **Simulation Manager**: Analyzes the DAG and spins up appropriate numerical physics solvers to simulate device behavior under stress.
4.  **Training Pipeline**: Consumes the multidimensional simulation channels and trains a machine learning surrogate model artifact (`.pkl`).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
