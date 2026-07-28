"""Endpoints de Web Push (PWA P1-C) — suscripción por usuario.

El worker envía "descarga lista" a las suscripciones del dueño del job (ver
``core/push.notify_user``). Estos endpoints gestionan el alta/baja de suscripciones
y exponen la clave pública VAPID para suscribirse desde el navegador.
"""

from fastapi import APIRouter, Depends, Request

from app.config import settings
from app.core import push
from app.core.rate_limiter import limiter
from app.dependencies import CurrentUser, get_current_user

from .schemas import (
    PushPublicKeyResponse,
    PushSubscribeRequest,
    PushSubscribeResponse,
    PushUnsubscribeRequest,
)

router = APIRouter(prefix="/push", tags=["push"])


@router.get("/public-key", response_model=PushPublicKeyResponse)
@limiter.limit("30/minute")
async def public_key(request: Request, user: CurrentUser = Depends(get_current_user)):
    """Estado del push + applicationServerKey (vacío si el push está desactivado)."""
    return PushPublicKeyResponse(
        enabled=settings.push_enabled,
        public_key=settings.vapid_public_key or None,
    )


@router.post("/subscribe", response_model=PushSubscribeResponse)
@limiter.limit("20/minute")
async def subscribe(
    request: Request,
    body: PushSubscribeRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """Registra una suscripción push del navegador actual para el usuario."""
    ok = await push.save_subscription(
        request.app.state.redis, user.tidal_user_id, body.to_subscription()
    )
    return PushSubscribeResponse(subscribed=ok)


@router.delete("/subscribe", response_model=PushSubscribeResponse)
@limiter.limit("20/minute")
async def unsubscribe(
    request: Request,
    body: PushUnsubscribeRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """Elimina una suscripción concreta (al desactivar las notificaciones)."""
    await push.delete_subscription(request.app.state.redis, user.tidal_user_id, body.endpoint)
    return PushSubscribeResponse(subscribed=False)
