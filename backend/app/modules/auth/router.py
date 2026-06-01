from fastapi import APIRouter, Depends, Request

from app.core.rate_limiter import limiter
from app.core.tidal import TidalDownloader
from app.dependencies import get_engine

from .schemas import AuthStatusResponse, DeviceAuthResponse
from .service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
service = AuthService()


@router.get("/status", response_model=AuthStatusResponse)
@limiter.limit("30/minute")
async def get_auth_status(
    request: Request,
    engine: TidalDownloader = Depends(get_engine),
):
    """Comprueba si el usuario está autenticado con Tidal."""
    return await service.get_status(engine, request.app.state)


@router.post("/device", response_model=DeviceAuthResponse)
@limiter.limit("5/minute")
async def start_device_auth(request: Request):
    """Inicia OAuth Device Auth de Tidal (máx. 5/min por IP)."""
    return await service.start_device_auth(request.app.state)


@router.post("/logout")
@limiter.limit("10/minute")
async def logout(
    request: Request,
    engine: TidalDownloader = Depends(get_engine),
):
    """Cierra la sesión de Tidal."""
    return await service.logout(engine, request.app.state)
