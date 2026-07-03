from fastapi import APIRouter, Depends, Request

from app.core.exceptions import ApiException
from app.core.rate_limiter import limiter
from app.core.tidal import TidalDownloader
from app.dependencies import get_engine

from .schemas import (
    DeviceAuthInitResponse,
    DeviceAuthPollResponse,
    SessionStatusResponse,
)
from .service import SessionService

router = APIRouter(prefix="/session", tags=["session-v2"])
_service = SessionService()


@router.get("/status", response_model=SessionStatusResponse)
@limiter.limit("30/minute")
async def get_session_status(
    request: Request,
    engine: TidalDownloader = Depends(get_engine),
):
    """Estado completo de la sesión Tidal: status, usuario y expiración."""
    try:
        return await _service.get_status(engine, getattr(request.app.state, "redis", None))
    except Exception as exc:
        raise ApiException("SERVER_ERROR", str(exc), 500, retriable=True) from exc


@router.post("/device-auth", response_model=DeviceAuthInitResponse)
@limiter.limit("5/minute")
async def start_device_auth(request: Request):
    """Inicia el flujo OAuth Device Authorization de Tidal."""
    try:
        return await _service.start_device_auth(request.app.state)
    except Exception as exc:
        raise ApiException(
            "SERVER_ERROR",
            f"Error iniciando autenticación con Tidal: {exc}",
            500,
            retriable=True,
        ) from exc


@router.get("/device-auth/{device_code}", response_model=DeviceAuthPollResponse)
@limiter.limit("120/minute")
async def poll_device_auth(
    request: Request,
    device_code: str,
    engine: TidalDownloader = Depends(get_engine),
):
    """Polling de autorización durante el Device Auth flow. Llamar cada `interval` segundos."""
    try:
        result = await _service.poll_device_auth(device_code, engine, request.app.state)
    except Exception as exc:
        raise ApiException("SERVER_ERROR", str(exc), 500, retriable=True) from exc

    # Estados terminales con error → 400
    if result.status in ("expired", "denied"):
        raise ApiException(
            "DEVICE_AUTH_EXPIRED",
            "El código de dispositivo ha expirado o fue denegado. Reinicia el flujo de autorización.",
            400,
            retriable=False,
        )

    return result
