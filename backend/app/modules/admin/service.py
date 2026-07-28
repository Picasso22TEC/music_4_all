"""Lógica del panel de administración: bans y resumen anti-abuso (Fase 6).

Reutiliza los stores ya existentes (``core.bans``, ``core.quotas``,
``core.user_session``) — este servicio solo orquesta y aplica las reglas de
administración (p.ej. no se puede banear a un administrador).
"""

from __future__ import annotations

from redis.asyncio import Redis

from app.config import settings
from app.core import abuse, bans, quotas
from app.core import user_session as us
from app.core.exceptions import ApiException

from .schemas import AdminUserInfo, BanListResponse, BanRecord, UnbanResponse


class AdminService:
    async def list_bans(self, redis: Redis) -> BanListResponse:
        records = await bans.list_bans(redis)
        return BanListResponse(bans=[BanRecord(**r) for r in records])

    async def ban(
        self,
        redis: Redis,
        target_uid: str,
        reason: str,
        ttl_seconds: int | None,
        banned_by: str,
    ) -> BanRecord:
        """Banea a un usuario. Rechaza banear administradores y auto-baneos."""
        target_uid = str(target_uid)
        if target_uid in settings.admin_tidal_user_ids:
            raise ApiException(
                "FORBIDDEN",
                "No se puede banear a un administrador.",
                403,
                retriable=False,
            )
        record = await bans.ban_user(
            redis,
            target_uid,
            reason=reason,
            banned_by=banned_by,
            ttl_seconds=ttl_seconds,
        )
        return BanRecord(**record)

    async def unban(self, redis: Redis, target_uid: str) -> UnbanResponse:
        unbanned = await bans.unban_user(redis, str(target_uid))
        # Borrón y cuenta nueva: sin limpiar strikes, el usuario reingresaría con el
        # contador lleno y volvería a disparar la alerta al primer límite.
        await abuse.clear_strikes(redis, str(target_uid))
        return UnbanResponse(tidal_user_id=str(target_uid), unbanned=unbanned)

    async def user_info(self, redis: Redis, target_uid: str) -> AdminUserInfo:
        """Resumen de un usuario para decidir un ban manual."""
        target_uid = str(target_uid)
        ban = await bans.get_ban(redis, target_uid)
        sessions = await us.list_user_sessions(redis, target_uid)
        daily = await quotas.daily_count(redis, target_uid)
        active = await quotas.active_jobs(redis, target_uid)
        return AdminUserInfo(
            tidal_user_id=target_uid,
            banned=ban is not None,
            ban=BanRecord(**ban) if ban else None,
            active_sessions=len(sessions),
            daily_downloads=daily,
            concurrent_jobs=len(active),
            strikes=await abuse.strike_count(redis, target_uid),
        )
