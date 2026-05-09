"""Endpoints de autenticación"""

from fastapi import APIRouter, HTTPException
from ..schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    """Endpoint de login"""
    # TODO: Implementar autenticación con Tidal
    return TokenResponse(access_token="placeholder_token")

@router.post("/logout")
async def logout():
    """Endpoint de logout"""
    return {"message": "Logged out"}
