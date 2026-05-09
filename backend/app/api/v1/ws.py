"""WebSocket para progreso en tiempo real"""

from fastapi import APIRouter, WebSocket

router = APIRouter(prefix="/ws", tags=["websocket"])

@router.websocket("/progress/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    """WebSocket para actualizaciones de progreso en tiempo real"""
    await websocket.accept()
    try:
        while True:
            # TODO: Enviar actualizaciones de progreso
            data = await websocket.receive_text()
            await websocket.send_text(f"Echo: {data}")
    except Exception as e:
        await websocket.close()
