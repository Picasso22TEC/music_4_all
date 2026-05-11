"""Router del módulo de autenticación."""

from fastapi import APIRouter

from .schemas import LoginRequest, TokenResponse
from .service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
service = AuthService()


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    """Endpoint de login."""
    return await service.login(credentials)


@router.post("/logout")
async def logout():
    """Endpoint de logout."""
    return await service.logout()
