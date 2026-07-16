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

import anyio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.config import settings
from app.core import redis_client as rc
from app.core import user_session as us
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
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
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

    Multiusuario: la identidad sale de la cookie de sesión de app (``m4a_sid``); el
    relay solo reenvía eventos cuyo ``user_id`` coincide con el del conectado
    (aislamiento — A no ve jobs de B). Si no hay cookie se cae al motor global
    (compatibilidad legacy/tests) y no se filtra por usuario.
    """
    redis = websocket.app.state.redis  # type: ignore[attr-defined]

    # ── Phase D: Validate session BEFORE accepting ────────────────────────────
    uid: str | None = None
    sid = websocket.cookies.get(settings.session_cookie_name)
    if sid:
        session_data = await us.get_app_session(redis, sid)
        if not session_data:
            await websocket.accept()
            await websocket.close(code=1008, reason="Unauthorized — session expired or missing")
            return
        uid = str(session_data["tidal_user_id"])
    else:
        # Fallback legacy: sin cookie, usar el estado del motor global.
        engine: TidalDownloader = websocket.app.state.engine  # type: ignore[attr-defined]
        is_auth: bool = await asyncio.to_thread(engine.check_auth)
        if not is_auth:
            await websocket.accept()
            await websocket.close(code=1008, reason="Unauthorized — session expired or missing")
            return

    await websocket.accept()

    pubsub = redis.pubsub()
    await pubsub.subscribe(rc.REDIS_ALL_JOBS_CHANNEL)

    # Serialises concurrent websocket.send_json() calls (relay vs main loop)
    send_lock = asyncio.Lock()

    # ── Phase C: Relay task — Redis → WebSocket ───────────────────────────────
    async def relay_redis() -> None:
        """
        Consumes the global progress channel and forwards spec messages.

        Polls with a short per-call timeout instead of ``pubsub.listen()``: an
        idle pub/sub read raises redis ``TimeoutError`` (the socket read times
        out while no job is publishing), and ``async for … in listen()`` lets
        that bubble up and kill the relay for the whole connection. A WebSocket
        opened before any download then never receives progress even though its
        subscription is still live — the job appears stuck in "queued".
        ``get_message(timeout=…)`` returns ``None`` on an idle tick, so the
        relay survives quiet periods and keeps forwarding once a job starts.
        Only a genuinely broken socket (send failure) or task cancellation ends
        it. Mirrors the resilient loop already used by the legacy per-job WS.
        """
        while True:
            try:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            except asyncio.CancelledError:
                break
            except Exception:
                # Transient pub/sub read hiccup (idle read timeout, etc.) — the
                # subscription is still valid, so keep the relay alive.
                await asyncio.sleep(0.1)
                continue

            if not isinstance(message, dict) or message.get("type") != "message":
                continue
            raw_data = message.get("data", "")
            if not isinstance(raw_data, str):
                continue
            try:
                flat: object = json.loads(raw_data)
            except json.JSONDecodeError:
                continue
            if not isinstance(flat, dict):
                continue
            # Aislamiento multiusuario: con sesión resuelta (uid), solo se reenvían
            # los eventos del propio usuario. Sin uid (fallback legacy) no se filtra.
            if uid is not None and str(flat.get("user_id") or "") != uid:
                continue
            spec = flat_to_spec_message(flat)
            if spec is None:
                continue
            try:
                async with send_lock:
                    await websocket.send_json(spec)
            except Exception:
                # WebSocket closed/broken — stop; the main loop handles teardown.
                break

    relay: asyncio.Task[None] = asyncio.create_task(relay_redis())

    # ── Phase C+P1: Main loop — server heartbeat (35 s) + client ping ─────────
    try:
        while True:
            try:
                incoming: object = await asyncio.wait_for(websocket.receive_json(), timeout=35.0)
                if isinstance(incoming, dict) and incoming.get("type") == "ping":
                    async with send_lock:
                        await websocket.send_json(
                            {
                                "type": "pong",
                                "timestamp": int(time.time() * 1000),
                            }
                        )
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
    # Shielded: if the surrounding task is being cancelled (e.g. abrupt client
    # disconnect detected via task cancellation), the pubsub subscription and
    # socket must still be released to avoid leaking Redis connections.
    finally:
        with anyio.CancelScope(shield=True):
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
