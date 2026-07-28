"""Detección de abuso por "strikes" (hardening público, Fase 6B).

Cada vez que un usuario topa una cuota (``quotas.assert_within_quota``) o es limitado
por rate-limit se registra un **strike**. Los strikes viven en una **ventana
deslizante** (``abuse_strike_window``): un ZSET por usuario con la marca de tiempo de
cada strike; al leer/escribir se podan los más viejos que la ventana. Cuando el conteo
alcanza ``abuse_strike_alert_threshold`` se **emite una alerta** (log estructurado +
métrica ``music4all_abuse_alerts_total``) para revisión manual.

**No hay auto-ban** (decisión del usuario): esto solo detecta y avisa; banear es una
acción humana desde ``/admin/bans``. La alerta se **deduplica** con una clave de
cooldown (una alerta por usuario y ventana) para no inundar los logs si el usuario
sigue golpeando el límite.

``abuse_strike_alert_threshold <= 0`` desactiva las alertas (se siguen contando los
strikes para el panel de admin, pero no se avisa).
"""

from __future__ import annotations

import time
import uuid

from redis.asyncio import Redis

from app.config import settings
from app.core.logging_config import get_logger
from app.core.metrics import abuse_alerts_total, abuse_strikes_total

logger = get_logger(__name__)

_STRIKES_KEY = "music4all:abuse:strikes:{uid}"
_ALERTED_KEY = "music4all:abuse:alerted:{uid}"


def _strikes_key(uid: str) -> str:
    return _STRIKES_KEY.format(uid=str(uid))


def _alerted_key(uid: str) -> str:
    return _ALERTED_KEY.format(uid=str(uid))


async def _prune_and_count(redis: Redis, uid: str, now: float) -> int:
    """Poda los strikes anteriores a la ventana y devuelve cuántos quedan."""
    key = _strikes_key(uid)
    await redis.zremrangebyscore(key, 0, now - settings.abuse_strike_window)
    return int(await redis.zcard(key))


async def record_strike(redis: Redis, uid: str, kind: str) -> int:
    """Registra un strike del usuario y devuelve su conteo en la ventana.

    ``kind`` etiqueta el motivo (quota_daily | quota_concurrent | rate_limit). Si el
    conteo alcanza el umbral, emite una alerta (deduplicada por ventana).
    """
    now = time.time()
    key = _strikes_key(uid)
    # Miembro único (marca + uuid) para que dos strikes en el mismo instante no se
    # solapen en el ZSET; el score es la marca de tiempo para la poda por ventana.
    await redis.zadd(key, {f"{now}:{uuid.uuid4().hex}": now})
    await redis.expire(key, settings.abuse_strike_window)
    count = await _prune_and_count(redis, uid, now)

    abuse_strikes_total.labels(kind=kind).inc()

    threshold = settings.abuse_strike_alert_threshold
    if threshold > 0 and count >= threshold:
        await _maybe_alert(redis, uid, count, kind)
    return count


async def _maybe_alert(redis: Redis, uid: str, count: int, kind: str) -> None:
    """Emite una alerta como mucho una vez por usuario y ventana."""
    alerted = _alerted_key(uid)
    # SET NX EX: solo el primero en la ventana consigue la clave → una sola alerta.
    won = await redis.set(alerted, "1", nx=True, ex=settings.abuse_strike_window)
    if not won:
        return
    abuse_alerts_total.inc()
    logger.warning(
        "Posible abuso: usuario superó el umbral de strikes",
        extra={
            "uid": str(uid),
            "strikes": count,
            "threshold": settings.abuse_strike_alert_threshold,
            "window_seconds": settings.abuse_strike_window,
            "last_kind": kind,
        },
    )


async def strike_count(redis: Redis, uid: str) -> int:
    """Strikes del usuario en la ventana actual (para el panel de admin)."""
    return await _prune_and_count(redis, uid, time.time())


async def clear_strikes(redis: Redis, uid: str) -> None:
    """Limpia los strikes y el cooldown de alerta de un usuario (p.ej. al desbanear)."""
    await redis.delete(_strikes_key(uid), _alerted_key(uid))
