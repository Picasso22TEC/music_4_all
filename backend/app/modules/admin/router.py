"""Endpoints de administración (Fase 6) — protegidos por ``require_admin``.

Todos exigen que el usuario actual esté en ``settings.admin_tidal_user_ids``. Con la
lista vacía (por defecto) nadie es admin y todo aquí responde 403.
"""

from fastapi import APIRouter, Depends, Request

from app.core.rate_limiter import limiter
from app.dependencies import CurrentUser, require_admin

from .schemas import (
    AdminUserInfo,
    BanListResponse,
    BanRecord,
    BanRequest,
    UnbanResponse,
)
from .service import AdminService

router = APIRouter(prefix="/admin", tags=["admin"])
_service = AdminService()


@router.get("/bans", response_model=BanListResponse)
@limiter.limit("30/minute")
async def list_bans(request: Request, admin: CurrentUser = Depends(require_admin)):
    """Lista los usuarios baneados actualmente."""
    return await _service.list_bans(request.app.state.redis)


@router.post("/bans", response_model=BanRecord)
@limiter.limit("20/minute")
async def ban_user(
    request: Request,
    body: BanRequest,
    admin: CurrentUser = Depends(require_admin),
):
    """Banea a un usuario (opcionalmente temporal con ``ttl_seconds``)."""
    return await _service.ban(
        request.app.state.redis,
        target_uid=body.tidal_user_id,
        reason=body.reason,
        ttl_seconds=body.ttl_seconds,
        banned_by=admin.tidal_user_id,
    )


@router.delete("/bans/{tidal_user_id}", response_model=UnbanResponse)
@limiter.limit("20/minute")
async def unban_user(
    request: Request,
    tidal_user_id: str,
    admin: CurrentUser = Depends(require_admin),
):
    """Levanta el ban de un usuario."""
    return await _service.unban(request.app.state.redis, tidal_user_id)


@router.get("/users/{tidal_user_id}", response_model=AdminUserInfo)
@limiter.limit("30/minute")
async def user_info(
    request: Request,
    tidal_user_id: str,
    admin: CurrentUser = Depends(require_admin),
):
    """Resumen anti-abuso de un usuario (sesiones, cuota, strikes) para decidir un ban."""
    return await _service.user_info(request.app.state.redis, tidal_user_id)
