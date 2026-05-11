"""WebSocket del módulo de descargas."""

from fastapi import APIRouter, WebSocket

router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/progress/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    """Canal en tiempo real para progreso de descarga."""
    await websocket.accept()
    try:
        while True:
            message = await websocket.receive_text()
            await websocket.send_text(f"{job_id}: {message}")
    except Exception:
        await websocket.close()
