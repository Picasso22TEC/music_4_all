import json
from datetime import datetime, timezone

import redis.asyncio as aioredis
from redis.asyncio import Redis

REDIS_SESSION_KEY = "music4all:session"
REDIS_HISTORY_KEY = "music4all:downloads:history"
HISTORY_MAX_SIZE = 200


async def create_client(url: str) -> Redis:
    return aioredis.from_url(url, decode_responses=True)


# ─── Session ──────────────────────────────────────────────────────────────────

async def save_session(redis: Redis, session_data: dict) -> None:
    ttl = _ttl_from_session(session_data)
    await redis.setex(REDIS_SESSION_KEY, ttl, json.dumps(session_data))


async def load_session(redis: Redis) -> dict | None:
    raw = await redis.get(REDIS_SESSION_KEY)
    return json.loads(raw) if raw else None


async def delete_session(redis: Redis) -> None:
    await redis.delete(REDIS_SESSION_KEY)


def _ttl_from_session(session_data: dict) -> int:
    """Calcula el TTL en segundos hasta que expire el token de Tidal."""
    try:
        expiry = datetime.fromisoformat(session_data["expiry_time"])
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        ttl = int((expiry - datetime.now(timezone.utc)).total_seconds())
        return max(300, ttl)  # mínimo 5 minutos
    except Exception:
        return 3600  # fallback: 1 hora


# ─── Download history ─────────────────────────────────────────────────────────

async def push_history(redis: Redis, record: dict) -> None:
    """Inserta un registro de descarga al inicio de la lista (más reciente primero)."""
    await redis.lpush(REDIS_HISTORY_KEY, json.dumps(record))
    await redis.ltrim(REDIS_HISTORY_KEY, 0, HISTORY_MAX_SIZE - 1)


async def get_history(redis: Redis) -> list[dict]:
    """Devuelve los últimos HISTORY_MAX_SIZE registros de descarga."""
    records = await redis.lrange(REDIS_HISTORY_KEY, 0, -1)
    return [json.loads(r) for r in records]
