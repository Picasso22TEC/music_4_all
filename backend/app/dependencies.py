"""Dependencias FastAPI de identidad y motor Tidal (multiusuario).

Modelo (Tidal como IdP): el navegador porta una cookie de sesión propia
(``m4a_sid``, httpOnly) mapeada en Redis a un ``tidal_user_id``. ``get_current_user``
resuelve esa cookie; ``get_authenticated_engine`` entrega el motor Tidal **de ese
usuario** desde el ``EngineRegistry`` (ya no un singleton global).

``get_engine`` (motor global) se mantiene solo para los routers legacy (``/auth/*``).
"""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, Request

from app.config import settings
from app.core import bans
from app.core import redis_client as rc
from app.core import user_session as us
from app.core.engine_registry import EngineRegistry
from app.core.exceptions import ApiException
from app.core.tidal import TidalDownloader


@dataclass
class CurrentUser:
    """Usuario autenticado de la petición actual (resuelto desde la cookie de sesión)."""

    tidal_user_id: str
    sid: str


# Cabecera con la que el frontend marca sus peticiones automáticas (auto-refresco).
# No renuevan el TTL idle de la sesión: si contaran como actividad, una pestaña
# abierta mantendría la sesión viva para siempre y el timeout de inactividad no
# serviría de nada. La actividad real del usuario la reporta `/session/keepalive`.
BACKGROUND_REQUEST_HEADER = "x-background-request"


def _unauthorized() -> ApiException:
    return ApiException(
        code="UNAUTHORIZED",
        message="No autenticado. Inicia sesión con Tidal.",
        http_status=401,
        retriable=False,
    )


def _banned(ban: dict) -> ApiException:
    reason = str(ban.get("reason") or "").strip()
    message = "Tu cuenta ha sido suspendida."
    if reason:
        message = f"{message} Motivo: {reason}"
    return ApiException(
        code="ACCOUNT_BANNED",
        message=message,
        http_status=403,
        retriable=False,
    )


# ── Identidad ────────────────────────────────────────────────────────────────
async def get_current_user_optional(request: Request) -> CurrentUser | None:
    """Resuelve la cookie ``m4a_sid`` → sesión de app → usuario. None si no hay sesión.

    Si el usuario está **baneado** lanza 403 ``ACCOUNT_BANNED`` en vez de devolverlo:
    este es el chokepoint autoritativo del ban (cubre todo endpoint autenticado y el
    opcional), complementario a la revocación de sesiones que hace ``ban_user``.
    """
    sid = request.cookies.get(settings.session_cookie_name)
    redis = getattr(request.app.state, "redis", None)
    if not sid or redis is None:
        return None
    touch = request.headers.get(BACKGROUND_REQUEST_HEADER) != "1"
    data = await us.get_app_session(redis, sid, touch=touch)
    if not data:
        return None
    uid = str(data["tidal_user_id"])
    ban = await bans.get_ban(redis, uid)
    if ban is not None:
        raise _banned(ban)
    user = CurrentUser(tidal_user_id=uid, sid=sid)
    # Lo lee `rate_limiter.user_or_ip_key` para aplicar el límite por usuario.
    request.state.current_user = user
    return user


async def get_current_user(request: Request) -> CurrentUser:
    """Como ``get_current_user_optional`` pero exige sesión válida (401 si falta)."""
    user = await get_current_user_optional(request)
    if user is None:
        raise _unauthorized()
    return user


# ── Redis ──────────────────────────────────────────────────────────────────────
def get_redis(request: Request):
    """Cliente Redis de la app (caché de catálogo, sesiones, cola, pub/sub)."""
    return request.app.state.redis


# ── Motor Tidal ──────────────────────────────────────────────────────────────
def get_engine_registry(request: Request) -> EngineRegistry:
    return request.app.state.engine_registry


def get_engine(request: Request) -> TidalDownloader:
    """Motor Tidal global (legacy `/auth/*`). No verifica auth por usuario."""
    return request.app.state.engine


async def get_authenticated_engine(
    request: Request,
    user: CurrentUser = Depends(get_current_user),
) -> TidalDownloader:
    """Motor Tidal **del usuario actual**, verificado/refrescado.

    401 si no hay sesión de app (via `get_current_user`) o si la sesión Tidal del
    usuario no puede autenticarse (tokens ausentes/expirados sin refresco).
    """
    registry: EngineRegistry = request.app.state.engine_registry
    engine = await registry.get_authenticated(request.app.state.redis, user.tidal_user_id)
    if engine is None:
        raise _unauthorized()
    return engine


# ── Administración (Fase 6) ──────────────────────────────────────────────────
async def require_admin(
    user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """Exige que el usuario actual sea administrador (``settings.admin_tidal_user_ids``).

    403 si la sesión es válida pero el usuario no es admin. Con la lista vacía
    (por defecto) **nadie** es admin, así que ``/admin/*`` queda cerrado hasta que
    se configure ``ADMIN_TIDAL_USER_IDS`` en el entorno.
    """
    if user.tidal_user_id not in settings.admin_tidal_user_ids:
        raise ApiException(
            code="FORBIDDEN",
            message="Se requieren permisos de administrador.",
            http_status=403,
            retriable=False,
        )
    return user


# ── Propiedad de jobs (anti-IDOR) ────────────────────────────────────────────
async def assert_job_owner(redis, job_id: str, user: CurrentUser) -> dict:
    """Carga el estado de un job y verifica que pertenece al usuario.

    404 si el job no existe; 403 si existe pero es de otro usuario. Los jobs sin
    ``user_id`` (creados antes de la migración) se consideran accesibles para no
    romper trabajos en vuelo durante la transición. Devuelve el estado del job.
    """
    job = await rc.get_job_state(redis, job_id)
    if job is None:
        raise ApiException("NOT_FOUND", "Job no encontrado", 404, retriable=False)
    owner = job.get("user_id")
    if owner is not None and str(owner) != user.tidal_user_id:
        raise ApiException(
            "FORBIDDEN", "No autorizado para acceder a este job", 403, retriable=False
        )
    return job
