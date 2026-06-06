"""
WebSocket endpoints para progreso de descargas.

Legacy (compatible):
    /ws/progress/{job_id}   — suscripción per-job, sin auth

RM-01 (nuevo):
    /ws/downloads           — canal unificado, con auth (SEC-01)
"""
from __future__ import annotations

import asyncio
import json
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core import redis_client as rc
from app.core.tidal import TidalDownloader
from app.modules.download.ws_mapper import flat_to_spec_message

router = APIRouter(prefix="/ws", tags=["websocket"])


# ─────────────────────────────────────────────────────────────────────────────
# Legacy WS — mantenido para compatibilidad con clientes anteriores
# ─────────────────────────────────────────────────────────────────────────────

@router.websocket("/progress/{job_id}")
async def websocket_progress(websocket: WebSocket, job_id: str) -> None:
    """
    Per-job WebSocket (legacy).
    Suscribe al canal Redis del job y retransmite mensajes flat sin transformar.
    NO aplica autenticación — mantener para compatibilidad.
    """
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


# ─────────────────────────────────────────────────────────────────────────────
# RM-01: Unified WebSocket — todos los jobs, mensajes spec, con auth
# ─────────────────────────────────────────────────────────────────────────────

@router.websocket("/downloads")
async def websocket_downloads(websocket: WebSocket) -> None:
    """
    Unified download WebSocket (RM-01).

    Multiplexes progress for ALL active jobs over a single connection.
    Transforms legacy flat messages to the discriminated-union spec format.

    Phases:
        Phase D — Auth check before accept (SEC-01)
        Phase C — Subscribe to REDIS_ALL_JOBS_CHANNEL, relay + transform
        Phase C — Heartbeat: 35 s idle → server_ping; client ping → pong
        Phase P2 — Send lock: serialises relay vs main-loop send_json calls
        Phase E — Clean lifecycle (pubsub, tasks, socket)
    """
    # ── Phase D: Validate session BEFORE accepting ────────────────────────────
    engine: TidalDownloader = websocket.app.state.engine  # type: ignore[attr-defined]
    is_auth: bool = await asyncio.to_thread(engine.check_auth)
    if not is_auth:
        # Accept then immediately close with 1008 Policy Violation (RFC 6455)
        await websocket.accept()
        await websocket.close(code=1008, reason="Unauthorized — session expired or missing")
        return

    await websocket.accept()

    redis = websocket.app.state.redis  # type: ignore[attr-defined]
    pubsub = redis.pubsub()
    await pubsub.subscribe(rc.REDIS_ALL_JOBS_CHANNEL)

    # Serialises concurrent websocket.send_json() calls (relay vs main loop)
    send_lock = asyncio.Lock()

    # ── Phase C: Relay task — Redis → WebSocket ───────────────────────────────
    async def relay_redis() -> None:
        """
        Consumes the global progress channel and forwards spec messages.
        Exits on any exception (WebSocket closed, pubsub error, task cancelled).
        """
        try:
            async for message in pubsub.listen():
                if not isinstance(message, dict):
                    continue
                if message.get("type") != "message":
                    continue
                raw_data = message.get("data", "")
                if not isinstance(raw_data, str):
                    continue
                try:
                    flat: object = json.loads(raw_data)
                    if isinstance(flat, dict):
                        spec = flat_to_spec_message(flat)
                        if spec is not None:
                            async with send_lock:
                                await websocket.send_json(spec)
                except json.JSONDecodeError:
                    pass
        except asyncio.CancelledError:
            pass
        except Exception:
            pass

    relay: asyncio.Task[None] = asyncio.create_task(relay_redis())

    # ── Phase C+P1: Main loop — server heartbeat (35 s) + client ping ─────────
    try:
        while True:
            try:
                incoming: object = await asyncio.wait_for(
                    websocket.receive_json(), timeout=35.0
                )
                if isinstance(incoming, dict) and incoming.get("type") == "ping":
                    async with send_lock:
                        await websocket.send_json({
                            "type": "pong",
                            "timestamp": int(time.time() * 1000),
                        })
            except TimeoutError:
                try:
                    async with send_lock:
                        await websocket.send_json({"type": "server_ping"})
                except Exception:
                    break
            except WebSocketDisconnect:
                break
            except Exception:
                break

    # ── Phase E: Clean lifecycle ──────────────────────────────────────────────
    finally:
        relay.cancel()
        await asyncio.gather(relay, return_exceptions=True)
        try:
            await pubsub.unsubscribe(rc.REDIS_ALL_JOBS_CHANNEL)
        except Exception:
            pass
        try:
            await pubsub.aclose()
        except Exception:
            pass
        try:
            await websocket.close()
        except Exception:
            pass
