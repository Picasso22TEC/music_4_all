"""
WebSocket de progreso — suscripción a Redis Pub/Sub por job_id.
El worker publica updates; el cliente los recibe en tiempo real (push, no polling).
"""
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core import redis_client as rc

router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/progress/{job_id}")
async def websocket_progress(websocket: WebSocket, job_id: str):
    await websocket.accept()
    redis = websocket.app.state.redis
    channel = rc.progress_channel(job_id)

    # Enviar estado actual antes de suscribirse (el job puede ya haber terminado)
    current = await rc.get_job_state(redis, job_id)
    if current:
        await websocket.send_json(current)
        if current.get("status") in ("completed", "failed"):
            await websocket.close()
            return

    pubsub = redis.pubsub()
    await pubsub.subscribe(channel)

    try:
        while True:
            message = await pubsub.get_message(
                ignore_subscribe_messages=True, timeout=1.0
            )
            if message and message["type"] == "message":
                data = json.loads(message["data"])
                await websocket.send_json(data)
                if data.get("status") in ("completed", "failed"):
                    break
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.aclose()
        try:
            await websocket.close()
        except Exception:
            pass
