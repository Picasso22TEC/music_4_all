from app.core.oauth_helper import ensure_https as _ensure_https
from app.core.oauth_helper import poll_device_auth as poll_oauth_future
from app.core.oauth_helper import start_device_auth as create_oauth_session
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

        session = pending["session"]
        future = pending["future"]

        authorized = await poll_oauth_future(session, future)
        if authorized is None:
            return AuthStatusResponse(
                authenticated=False, message="Esperando autorización del usuario"
            )

        app_state.pending_oauth = None
        if authorized:
            engine.session = session
            session_data = engine.get_session_data()
            if session_data:
                await self.repository.save_session(app_state.redis, session_data)
            return AuthStatusResponse(authenticated=True)

        return AuthStatusResponse(authenticated=False, message="Autorización fallida o expirada")

    async def start_device_auth(self, app_state) -> DeviceAuthResponse:
        session, link, future = await create_oauth_session()
        app_state.pending_oauth = {"session": session, "future": future, "link": link}

        return DeviceAuthResponse(
            verification_uri_complete=_ensure_https(
                str(getattr(link, "verification_uri_complete", "") or "")
            ),
            user_code=getattr(link, "user_code", ""),
            expires_in=getattr(link, "expires_in", 300),
        )

    async def logout(self, engine: TidalDownloader, app_state) -> dict:
        engine.session = engine._load_session(None)
        app_state.pending_oauth = None
        await self.repository.delete_session(app_state.redis)
        return {"message": "Sesión cerrada"}
