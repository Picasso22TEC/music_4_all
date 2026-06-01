from redis.asyncio import Redis

from app.core import redis_client as rc


class AuthRepository:
    """Persistencia de sesión en Redis con TTL automático."""

    async def save_session(self, redis: Redis, session_data: dict) -> None:
        await rc.save_session(redis, session_data)

    async def load_session(self, redis: Redis) -> dict | None:
        return await rc.load_session(redis)

    async def delete_session(self, redis: Redis) -> None:
        await rc.delete_session(redis)
