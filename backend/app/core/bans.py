"""Ban de usuarios (hardening público, Fase 6).

Un ban se guarda en Redis bajo ``music4all:banned:{uid}`` como JSON con el motivo,
quién lo aplicó y (opcional) cuándo expira. El ban es la última línea anti-abuso:
un usuario baneado no puede autenticarse, descargar ni abrir el WebSocket.

El gate real vive en tres puntos (todos consultan ``is_banned`` aquí):

- ``get_current_user_optional`` (dependencies.py) → 403 ``ACCOUNT_BANNED`` en todo
  endpoint autenticado. Es el chokepoint autoritativo.
- El login (``session/service.py``) → un baneado no obtiene cookie ni tokens nuevos.
- El WebSocket ``/ws/downloads`` → se cierra con 1008.

Al banear se **revocan todas las sesiones de app** del usuario (invalidación de
credenciales al sancionar, según OWASP): el baneado queda fuera al instante, sin
esperar a que caduque su cookie.

**Ban temporal:** con ``ttl_seconds`` la clave Redis expira sola (se auto-levanta el
ban). Sin ttl, el ban es permanente hasta un ``unban_user`` explícito.

Los admins (``settings.admin_tidal_user_ids``) no son baneables: el servicio lo
rechaza antes de llegar aquí, pero se documenta como invariante del módulo.
"""

from __future__ import annotations

import json
import time

from redis.asyncio import Redis

from app.core import user_session as us
from app.core.logging_config import get_logger
from app.core.metrics import bans_total

logger = get_logger(__name__)

_BAN_KEY = "music4all:banned:{uid}"


def _ban_key(uid: str) -> str:
    return _BAN_KEY.format(uid=str(uid))


async def get_ban(redis: Redis, uid: str) -> dict | None:
    """Devuelve el registro de ban del usuario, o None si no está baneado.

    Con ban temporal, la clave expira sola en Redis → tras la expiración esto
    devuelve None sin trabajo extra (el ban se auto-levanta).
    """
    raw = await redis.get(_ban_key(uid))
    if not raw:
        return None
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        # Registro corrupto: trátalo como no baneado en vez de romper cada request.
        return None


async def is_banned(redis: Redis, uid: str) -> bool:
    return await get_ban(redis, uid) is not None


async def ban_user(
    redis: Redis,
    uid: str,
    reason: str = "",
    banned_by: str = "",
    ttl_seconds: int | None = None,
) -> dict:
    """Banea a un usuario y revoca todas sus sesiones de app. Devuelve el registro.

    ``ttl_seconds`` (>0) hace el ban temporal (la clave expira sola). Revocar las
    sesiones expulsa al usuario de inmediato; el gate de ``get_current_user`` cubre
    la ventana entre la revocación y la caducidad de la cookie del navegador.
    """
    uid = str(uid)
    now = time.time()
    record = {
        "tidal_user_id": uid,
        "reason": reason,
        "banned_by": str(banned_by),
        "banned_at": now,
        "expires_at": (now + ttl_seconds) if ttl_seconds and ttl_seconds > 0 else None,
    }
    key = _ban_key(uid)
    payload = json.dumps(record)
    if ttl_seconds and ttl_seconds > 0:
        await redis.setex(key, ttl_seconds, payload)
    else:
        await redis.set(key, payload)

    revoked = await us.revoke_all_sessions(redis, uid)
    bans_total.labels(action="ban").inc()
    logger.info(
        "Usuario baneado",
        extra={"uid": uid, "banned_by": banned_by, "ttl_seconds": ttl_seconds, "revoked": revoked},
    )
    return record


async def unban_user(redis: Redis, uid: str) -> bool:
    """Levanta el ban de un usuario. Devuelve True si existía un ban."""
    removed = await redis.delete(_ban_key(uid))
    if removed:
        bans_total.labels(action="unban").inc()
        logger.info("Ban levantado", extra={"uid": str(uid)})
    return bool(removed)


async def list_bans(redis: Redis) -> list[dict]:
    """Lista los bans activos (para el panel de administración)."""
    out: list[dict] = []
    async for key in redis.scan_iter(match=_BAN_KEY.format(uid="*")):
        raw = await redis.get(key)
        if not raw:
            continue
        try:
            out.append(json.loads(raw))
        except (ValueError, TypeError):
            continue
    out.sort(key=lambda b: b.get("banned_at", 0.0), reverse=True)
    return out
