import asyncio

import tidalapi

from app.core.tidal import TidalDownloader

from .repository import AuthRepository
from .schemas import AuthStatusResponse, DeviceAuthResponse


class AuthService:
    def __init__(self) -> None:
        self.repository = AuthRepository()

    async def get_status(self, engine: TidalDownloader, app_state) -> AuthStatusResponse:
        if engine.check_auth():
            return AuthStatusResponse(authenticated=True)

        pending = getattr(app_state, "pending_oauth", None)
        if pending is None:
            return AuthStatusResponse(authenticated=False, message="Sin sesión activa")

        future = pending["future"]
        session = pending["session"]

        # El future resuelve cuando el usuario completa el OAuth en el navegador
        if not future.done():
            return AuthStatusResponse(authenticated=False, message="Esperando autorización del usuario")

        if session.check_login():
            # Transferir sesión autenticada al motor principal
            engine.session = session
            session_data = engine.get_session_data()
            if session_data:
                await asyncio.to_thread(self.repository.save_session, session_data)
            app_state.pending_oauth = None
            return AuthStatusResponse(authenticated=True)

        app_state.pending_oauth = None
        return AuthStatusResponse(authenticated=False, message="Autorización fallida o expirada")

    async def start_device_auth(self, app_state) -> DeviceAuthResponse:
        session = tidalapi.Session()
        link, future = await asyncio.to_thread(session.login_oauth)

        app_state.pending_oauth = {"session": session, "future": future, "link": link}

        return DeviceAuthResponse(
            verification_uri_complete=link.verification_uri_complete,
            user_code=getattr(link, "user_code", ""),
            expires_in=getattr(link, "expires_in", 300),
        )

    async def logout(self, engine: TidalDownloader, app_state) -> dict:
        engine.session = engine._load_session(None)
        app_state.pending_oauth = None
        await asyncio.to_thread(self.repository.delete_session)
        return {"message": "Sesión cerrada"}
