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


# ─── PKCE (segunda sesión Tidal para 16-bit LOSSLESS — Fase 5) ────────────────
# El cliente device flow (Automotive) da hi-res 24-bit pero no 16-bit; el cliente
# PKCE web sí da 16-bit. Se conecta como sesión adicional del mismo usuario.


class PkceStartResponse(BaseModel):
    #: URL de login web de Tidal (el usuario la abre, se loguea y acaba en una
    #: página "Oops" cuyo URL debe copiar y pegar en /session/pkce/complete).
    login_url: str


class PkceCompleteRequest(BaseModel):
    #: La URL COMPLETA de la página "Oops" (contiene ?code=...). El redirect_uri de
    #: Tidal es fijo, así que no hay callback propio: el usuario la pega a mano.
    redirect_url: str


class PkceStatusResponse(BaseModel):
    #: True si el usuario tiene una sesión PKCE (16-bit) conectada.
    connected: bool
