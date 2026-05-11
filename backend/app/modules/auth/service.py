"""Servicio del módulo de autenticación."""

from .repository import AuthRepository
from .schemas import LoginRequest, TokenResponse


class AuthService:
    """Lógica de negocio de autenticación."""

    def __init__(self, repository: AuthRepository | None = None):
        self.repository = repository or AuthRepository()

    async def login(self, credentials: LoginRequest) -> TokenResponse:
        return await self.repository.login(credentials)

    async def logout(self) -> dict:
        return await self.repository.logout()
