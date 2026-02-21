# Running the Full Anukriti Platform

## Architecture
The platform consists of 4 main services:
1.  **Anukriti Core**: The central brain (FastAPI, Port 8000)
2.  **Anukriti Sim**: Simulation Engine (FastAPI Backend :8001, Frontend :Local)
3.  **Anukriti Req**: Requirement Management UI (Next.js :3000)
4.  **Anukriti 3D**: Visualization UI (Static/Serve :3002)

## Unified Launcher
We provide a python script to launch everything at once:

```bash
python run_platform.py
```

This will attempt to start all 4 services in parallel.

## Prerequisites

### Python Services (Core & Sim)
- Python 3.9+
- Dependencies installed: `pip install -r anukriti-core/requirements.txt`

### Web Frontends (Req & 3D)
- Node.js 18+
- NPM installed

> **Note:** If you are on a restricted Windows environment where PowerShell scripts are disabled, the Node.js frontends might fail to start via the launcher. You may need to run `Set-ExecutionPolicy RemoteSigned` in PowerShell as Administrator, or run the `npm` commands manually in separate terminals.

## Manual Startup
If the launcher fails, you can run services individually:

**Core:**
```bash
cd anukriti-core
uvicorn main:app --reload --port 8000
```

**Sim Backend:**
```bash
cd repos/anukriti-sim
uvicorn backend.app.main:app --reload --port 8001
```

**Req Frontend:**
```bash
cd repos/anukriti-req/frontend
npm run dev
```

**3D Viewer:**
```bash
cd repos/anukriti_3d_demo
npx serve .
```
