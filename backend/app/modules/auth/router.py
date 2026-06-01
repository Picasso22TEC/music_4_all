from fastapi import APIRouter, Depends, Request

from app.core.tidal import TidalDownloader
from app.dependencies import get_engine

from .schemas import AuthStatusResponse, DeviceAuthResponse
from .service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
service = AuthService()


@router.get("/status", response_model=AuthStatusResponse)
async def get_auth_status(request: Request, engine: TidalDownloader = Depends(get_engine)):
    """Comprueba si el usuario está autenticado con Tidal."""
    return await service.get_status(engine, request.app.state)


@router.post("/device", response_model=DeviceAuthResponse)
async def start_device_auth(request: Request):
    """Inicia el flujo OAuth Device Authorization de Tidal."""
    return await service.start_device_auth(request.app.state)


@router.post("/logout")
async def logout(request: Request, engine: TidalDownloader = Depends(get_engine)):
    """Cierra la sesión actual de Tidal."""
    return await service.logout(engine, request.app.state)
