"""Web Push por usuario (PWA P1-C).

Cada usuario puede tener varias suscripciones (una por dispositivo/navegador). Se
guardan en un hash Redis ``user:{uid}:push:subs`` (endpoint → JSON de la suscripción),
así el endpoint deduplica y permite borrar una concreta.

``notify_user`` envía un push a todas las suscripciones del usuario firmando con VAPID
(``pywebpush``, que es bloqueante → se corre en un hilo). Una suscripción caducada
(404/410) se **purga** automáticamente. Todo es **best-effort**: si el push está
desactivado (sin claves VAPID) o falla, nunca rompe al llamante (p.ej. el worker).
"""

from __future__ import annotations

import asyncio
import json

from pywebpush import WebPushException, webpush
from redis.asyncio import Redis

from app.config import settings
from app.core.logging_config import get_logger
from app.core.metrics import push_notifications_total

logger = get_logger(__name__)

_SUBS_KEY = "user:{uid}:push:subs"


def _key(uid: str) -> str:
    return _SUBS_KEY.format(uid=str(uid))


async def save_subscription(redis: Redis, uid: str, subscription: dict) -> bool:
    """Guarda (o actualiza) una suscripción del usuario. False si no trae endpoint."""
    endpoint = subscription.get("endpoint")
    if not endpoint:
        return False
    await redis.hset(_key(uid), str(endpoint), json.dumps(subscription))
    return True


async def list_subscriptions(redis: Redis, uid: str) -> list[dict]:
    raw = await redis.hgetall(_key(uid))
    out: list[dict] = []
    for value in raw.values():
        try:
            out.append(json.loads(value))
        except (ValueError, TypeError):
            continue
    return out


async def delete_subscription(redis: Redis, uid: str, endpoint: str) -> None:
    await redis.hdel(_key(uid), endpoint)


async def delete_all(redis: Redis, uid: str) -> None:
    await redis.delete(_key(uid))


def _send_one(subscription: dict, payload: str) -> None:
    webpush(
        subscription_info=subscription,
        data=payload,
        vapid_private_key=settings.vapid_private_key,
        vapid_claims={"sub": settings.vapid_subject},
    )


async def notify_user(redis: Redis, uid: str | None, payload: dict) -> None:
    """Envía un push a todas las suscripciones del usuario. Best-effort.

    No-op si el push está desactivado, no hay uid o el usuario no tiene suscripciones.
    Purga las suscripciones caducadas (404/410).
    """
    if not settings.push_enabled or not uid:
        return
    subs = await list_subscriptions(redis, uid)
    if not subs:
        return
    data = json.dumps(payload)
    for sub in subs:
        try:
            await asyncio.to_thread(_send_one, sub, data)
            push_notifications_total.labels(result="sent").inc()
        except WebPushException as exc:
            status = getattr(exc.response, "status_code", None)
            if status in (404, 410):  # suscripción muerta → purgar
                await delete_subscription(redis, uid, str(sub.get("endpoint", "")))
                push_notifications_total.labels(result="expired").inc()
            else:
                push_notifications_total.labels(result="error").inc()
                logger.warning("Web Push falló", extra={"uid": str(uid), "status": status})
        except Exception:  # noqa: BLE001 — el push nunca debe romper al llamante
            push_notifications_total.labels(result="error").inc()
