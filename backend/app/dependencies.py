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


def _unauthorized() -> ApiException:
    return ApiException(
        code="UNAUTHORIZED",
        message="No autenticado. Inicia sesión con Tidal.",
        http_status=401,
        retriable=False,
    )


# ── Identidad ────────────────────────────────────────────────────────────────
async def get_current_user_optional(request: Request) -> CurrentUser | None:
    """Resuelve la cookie ``m4a_sid`` → sesión de app → usuario. None si no hay sesión."""
    sid = request.cookies.get(settings.session_cookie_name)
    redis = getattr(request.app.state, "redis", None)
    if not sid or redis is None:
        return None
    data = await us.get_app_session(redis, sid)
    if not data:
        return None
    user = CurrentUser(tidal_user_id=str(data["tidal_user_id"]), sid=sid)
    # Lo lee `rate_limiter.user_or_ip_key` para aplicar el límite por usuario.
    request.state.current_user = user
    return user


async def get_current_user(request: Request) -> CurrentUser:
    """Como ``get_current_user_optional`` pero exige sesión válida (401 si falta)."""
    user = await get_current_user_optional(request)
    if user is None:
        raise _unauthorized()
    return user


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
