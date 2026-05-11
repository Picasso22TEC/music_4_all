"""Repositorio del módulo de autenticación."""

from .schemas import LoginRequest, TokenResponse


class AuthRepository:
    """Acceso a datos de autenticación."""

    async def login(self, credentials: LoginRequest) -> TokenResponse:
        """Resolver una autenticación de ejemplo."""
        return TokenResponse(access_token="placeholder_token")

    async def logout(self) -> dict:
        """Resolver una salida de sesión de ejemplo."""
        return {"message": "Logged out"}
