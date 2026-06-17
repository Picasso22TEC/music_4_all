from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime

import tidalapi

from app.core import redis_client as rc
from app.core.tidal import TidalDownloader

from .schemas import (
    DeviceAuthInitResponse,
    DeviceAuthPollResponse,
    SessionStatusResponse,
    UserOut,
)

# ─── Helpers ──────────────────────────────────────────────────────────────────


def _ensure_https(url: str) -> str:
    """Prepend https:// to a URL that Tidal may return without a scheme.

    Tidal's Device Authorization API returns bare hostnames such as
    'link.tidal.com/ABCDE'.  Without a scheme, browsers treat the value as a
    relative path and the user lands on a 404.  http:// is preserved as-is to
    avoid breaking local/dev environments; https:// is left untouched.
    """
    url = url.strip()
    if not url:
        return ""
    if url.startswith("http://") or url.startswith("https://"):
        return url
    return f"https://{url}"


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
        is_auth = await asyncio.to_thread(engine.check_auth)
        if not is_auth:
            return SessionStatusResponse(status="expired", user=None, expires_at=None)

        session = engine.session
        expires_at = await asyncio.to_thread(_expires_at_from_session, session)
        user = await asyncio.to_thread(_user_out_from_session, session)

        return SessionStatusResponse(
            status="active",
            user=user,
            expires_at=expires_at,
        )

    async def start_device_auth(self, app_state: object) -> DeviceAuthInitResponse:
        session = tidalapi.Session()

        link, future = await asyncio.to_thread(session.login_oauth)

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
        engine: TidalDownloader,
        app_state: object,
    ) -> DeviceAuthPollResponse:
        pending_v2: dict = getattr(app_state, "pending_oauth_v2", {})
        entry = pending_v2.get(device_code)

        if entry is None:
            return DeviceAuthPollResponse(status="expired")

        future = entry["future"]
        session: tidalapi.Session = entry["session"]

        if not future.done():
            return DeviceAuthPollResponse(status="pending")

        # Future completado — verificar si el login tuvo éxito
        try:
            is_logged = await asyncio.to_thread(session.check_login)
            if is_logged:
                engine.session = session

                session_data = await asyncio.to_thread(engine.get_session_data)
                if session_data:
                    await rc.save_session(app_state.redis, session_data)  # type: ignore[attr-defined]

                user = await asyncio.to_thread(_user_out_from_session, session)
                expires_at = await asyncio.to_thread(_expires_at_from_session, session)

                # Limpiar entradas
                del pending_v2[device_code]
                app_state.pending_oauth = None  # type: ignore[attr-defined]

                return DeviceAuthPollResponse(
                    status="authorized",
                    user=user,
                    expires_at=expires_at,
                )
        except Exception:
            pass

        # Login fallido o denegado
        pending_v2.pop(device_code, None)
        return DeviceAuthPollResponse(status="denied")
