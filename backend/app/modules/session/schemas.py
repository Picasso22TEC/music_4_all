from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class UserOut(BaseModel):
    id: str
    email: str
    country_code: str
    plan: str  # "FREE" | "HIFI" | "HIFI_PLUS"


class SessionStatusResponse(BaseModel):
    status: Literal["active", "expired"]
    user: UserOut | None = None
    expires_at: str | None = None  # ISO 8601


class DeviceAuthInitResponse(BaseModel):
    device_code: str
    user_code: str
    verification_uri: str
    verification_uri_complete: str
    expires_in: int
    interval: int


class DeviceAuthPollResponse(BaseModel):
    status: Literal["pending", "authorized", "denied", "expired"]
    user: UserOut | None = None
    expires_at: str | None = None


class SessionInfo(BaseModel):
    """Una sesión de app activa del usuario (panel de sesiones)."""

    sid: str
    created_at: float  # epoch seconds
    last_seen: float  # epoch seconds
    ip: str
    user_agent: str
    current: bool  # True si es la sesión de la petición actual


class KeepaliveResponse(BaseModel):
    """Respuesta de `/session/keepalive`.

    `idle_ttl_seconds` lo dicta el servidor para que el vigilante del navegador no
    tenga que duplicar el plazo (y desincronizarse en cuanto alguien cambie el
    ajuste). `expires_in_seconds` es lo que queda si el usuario no vuelve a actuar.
    """

    idle_ttl_seconds: int
    expires_in_seconds: int


class SessionListResponse(BaseModel):
    sessions: list[SessionInfo]
