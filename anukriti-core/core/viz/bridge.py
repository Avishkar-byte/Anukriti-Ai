import asyncio
from typing import Any, Dict, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(prefix="/viz", tags=["3D Visualization"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        for connection in self.active_connections:
            await connection.send_json(message)


manager = ConnectionManager()


@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
            # Echo or process client events (e.g., user clicked a part)
            # data_json = json.loads(data)
            # await manager.broadcast(f"Client #{client_id} says: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def stream_simulation_data(simulation_id: str):
    """
    Background task to stream data to connected clients.
    """
    for i in range(100):
        data_packet = {
            "type": "telemetry",
            "sim_id": simulation_id,
            "timestamp": i,
            "values": {"rpm": 1000 + i * 10, "temperature": 35.0 + i * 0.1},
        }
        await manager.broadcast(data_packet)
        await asyncio.sleep(0.1)
