from __future__ import annotations

import asyncio
import time
import uuid
from datetime import UTC, datetime

import tidalapi
from fastapi import Request, Response

from app.config import settings
from app.core import user_session as us
from app.core.logging_config import get_logger
from app.core.oauth_helper import ensure_https as _ensure_https
from app.core.oauth_helper import poll_device_auth as poll_oauth_future
from app.core.oauth_helper import start_device_auth as create_oauth_session
from app.core.tidal import TidalDownloader

from .schemas import (
    DeviceAuthInitResponse,
    DeviceAuthPollResponse,
    SessionInfo,
    SessionListResponse,
    SessionStatusResponse,
    UserOut,
)

logger = get_logger(__name__)

# ─── Cookie de sesión de app ──────────────────────────────────────────────────


def set_session_cookie(response: Response, sid: str) -> None:
    """Emite la cookie httpOnly ``m4a_sid``. El servidor manda el ciclo de vida real
    (TTL idle + absoluto en Redis); ``max_age`` cubre el máximo absoluto."""
    response.set_cookie(
        key=settings.session_cookie_name,
        value=sid,
        max_age=settings.session_absolute_ttl,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.session_cookie_name,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
    )


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _plan_from_session(session: object) -> str:
    try:
        user = getattr(session, "user", None)
        sub = getattr(user, "subscription", None) if user else None
        if sub is None:
            return "HIFI"
        s = str(getattr(sub, "type", "") or "").upper()
        if "PLUS" in s or "HIFI_PLUS" in s:
            return "HIFI_PLUS"
        if "FREE" in s:
            return "FREE"
        return "HIFI"
    except Exception:
        return "HIFI"


def _user_out_from_session(session: object) -> UserOut | None:
    try:
        user = getattr(session, "user", None)
        if user is None:
            return None
        return UserOut(
            id=str(getattr(user, "id", "") or ""),
            email=str(getattr(user, "email", "") or ""),
            country_code=str(
                getattr(user, "country_code", "") or getattr(session, "country_code", "") or ""
            ),
            plan=_plan_from_session(session),
        )
    except Exception:
        return None


def _expires_at_from_session(session: object) -> str | None:
    try:
        expiry = getattr(session, "expiry_time", None)
        if expiry and isinstance(expiry, datetime):
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=UTC)
            return expiry.isoformat()
        return None
    except Exception:
        return None


# ─── Service ──────────────────────────────────────────────────────────────────


class SessionService:
    async def get_status(self, engine: TidalDownloader) -> SessionStatusResponse:
        """Construye el estado a partir de un motor ya autenticado (por usuario).

        La verificación/refresco de token la hace `EngineRegistry.get_authenticated`
        antes de llegar aquí; este método solo serializa usuario y expiración.
        """
        session = engine.session
        expires_at = await asyncio.to_thread(_expires_at_from_session, session)
        user = await asyncio.to_thread(_user_out_from_session, session)
        return SessionStatusResponse(status="active", user=user, expires_at=expires_at)

    async def start_device_auth(self, app_state: object) -> DeviceAuthInitResponse:
        session, link, future = await create_oauth_session()

        # Extraer campos del link (getattr con defaults para robustez ante cambios de API)
        device_code: str = str(getattr(link, "device_code", None) or uuid.uuid4())
        user_code: str = str(getattr(link, "user_code", "") or "")
        expires_in: int = int(getattr(link, "expires_in", 900) or 900)
        interval: int = int(getattr(link, "interval", 5) or 5)

        # Normalizar esquema — Tidal devuelve URLs sin https:// (ej. "link.tidal.com/ABC")
        verification_uri: str = _ensure_https(
            str(getattr(link, "verification_uri", "tidal.com/activate") or "tidal.com/activate")
        )
        raw_complete: str = str(getattr(link, "verification_uri_complete", "") or "")
        verification_uri_complete: str = _ensure_https(raw_complete)
        # Fallback: si Tidal no devuelve verification_uri_complete, construirlo
        if not verification_uri_complete and user_code:
            verification_uri_complete = f"{verification_uri}/{user_code}"

        # Almacenar en dict v2 keyed by device_code
        if not hasattr(app_state, "pending_oauth_v2"):
            app_state.pending_oauth_v2 = {}  # type: ignore[attr-defined]

        app_state.pending_oauth_v2[device_code] = {  # type: ignore[attr-defined]
            "session": session,
            "future": future,
            # Instante (monotónico) tras el cual el flujo se considera abandonado.
            # Permite podar entradas huérfanas y evitar una fuga en memoria.
            "expires_at": time.monotonic() + expires_in,
        }

        # Mantener compatibilidad con endpoint legacy /auth/device
        app_state.pending_oauth = {"session": session, "future": future, "link": link}  # type: ignore[attr-defined]

        return DeviceAuthInitResponse(
            device_code=device_code,
            user_code=user_code,
            verification_uri=verification_uri,
            verification_uri_complete=verification_uri_complete,
            expires_in=expires_in,
            interval=interval,
        )

    async def poll_device_auth(
        self,
        device_code: str,
        request: Request,
        response: Response,
    ) -> DeviceAuthPollResponse:
        app_state = request.app.state
        pending_v2: dict = getattr(app_state, "pending_oauth_v2", {})

        # Poda defensiva de flujos abandonados/expirados (el usuario nunca autoriza
        # ni cancela). Sin esto, las entradas se acumularían indefinidamente.
        now = time.monotonic()
        for stale in [c for c, e in pending_v2.items() if 0 < e.get("expires_at", 0) < now]:
            pending_v2.pop(stale, None)

        entry = pending_v2.get(device_code)
        if entry is None:
            return DeviceAuthPollResponse(status="expired")

        future = entry["future"]
        session: tidalapi.Session = entry["session"]

        authorized = await poll_oauth_future(session, future)
        if authorized is None:
            return DeviceAuthPollResponse(status="pending")

        if authorized:
            user = await asyncio.to_thread(_user_out_from_session, session)
            expires_at = await asyncio.to_thread(_expires_at_from_session, session)

            # ── Sesión multiusuario: tokens cifrados por usuario + cookie de app ──
            redis = app_state.redis
            uid = us.user_id_from_session(session)
            if uid:
                token_data = us.token_data_from_session(session)
                await us.store_user_tokens(redis, uid, "oauth", token_data)
                sid = await us.create_app_session(
                    redis,
                    uid,
                    ip=(request.client.host if request.client else ""),
                    ua=request.headers.get("user-agent", ""),
                )
                set_session_cookie(response, sid)
            else:
                logger.warning("Login Tidal sin user.id; no se pudo crear sesión de app")

            # Limpiar entradas del flujo device
            del pending_v2[device_code]
            app_state.pending_oauth = None

            return DeviceAuthPollResponse(
                status="authorized",
                user=user,
                expires_at=expires_at,
            )

        # Login fallido o denegado
        pending_v2.pop(device_code, None)
        return DeviceAuthPollResponse(status="denied")

    # ── Logout + panel de sesiones ───────────────────────────────────────────
    async def logout(self, redis, sid: str | None, response: Response) -> dict:
        """Cierra la sesión de app actual (no toca las de otros dispositivos)."""
        if sid:
            await us.delete_app_session(redis, sid)
        clear_session_cookie(response)
        return {"message": "Sesión cerrada"}

    async def list_sessions(
        self, redis, tidal_user_id: str, current_sid: str | None
    ) -> SessionListResponse:
        raw = await us.list_user_sessions(redis, tidal_user_id)
        sessions = [
            SessionInfo(
                sid=s["sid"],
                created_at=float(s.get("created_at", 0.0)),
                last_seen=float(s.get("last_seen", 0.0)),
                ip=str(s.get("ip", "")),
                user_agent=str(s.get("ua", "")),
                current=(s["sid"] == current_sid),
            )
            for s in raw
        ]
        # Más recientes primero
        sessions.sort(key=lambda s: s.last_seen, reverse=True)
        return SessionListResponse(sessions=sessions)

    async def revoke_session(self, redis, tidal_user_id: str, sid: str) -> dict:
        """Cierra una sesión concreta del usuario (verificando que le pertenece)."""
        owned = {s["sid"] for s in await us.list_user_sessions(redis, tidal_user_id)}
        if sid not in owned:
            return {"revoked": 0}
        await us.delete_app_session(redis, sid)
        return {"revoked": 1}

    async def revoke_other_sessions(self, redis, tidal_user_id: str, keep_sid: str | None) -> dict:
        revoked = await us.revoke_all_sessions(redis, tidal_user_id, keep_sid=keep_sid)
        return {"revoked": revoked}
