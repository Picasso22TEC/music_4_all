"""Schemas del panel de administración (Fase 6)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class BanRequest(BaseModel):
    """Solicitud de ban de un usuario Tidal."""

    tidal_user_id: str = Field(..., min_length=1, max_length=64)
    reason: str = Field("", max_length=500)
    # >0 = ban temporal (segundos); None/0 = permanente hasta unban explícito.
    ttl_seconds: int | None = Field(None, ge=0)


class BanRecord(BaseModel):
    """Registro de un ban activo."""

    tidal_user_id: str
    reason: str = ""
    banned_by: str = ""
    banned_at: float = 0.0
    expires_at: float | None = None


class BanListResponse(BaseModel):
    bans: list[BanRecord]


class UnbanResponse(BaseModel):
    tidal_user_id: str
    unbanned: bool


class AdminUserInfo(BaseModel):
    """Resumen anti-abuso de un usuario (para decidir un ban manual)."""

    tidal_user_id: str
    banned: bool
    ban: BanRecord | None = None
    active_sessions: int = 0
    daily_downloads: int = 0
    concurrent_jobs: int = 0
    strikes: int = 0
