from __future__ import annotations

import asyncio
import time
import uuid
from datetime import UTC, datetime

import tidalapi
from fastapi import Request, Response

from app.config import settings
from app.core import bans
from app.core import user_session as us
from app.core.exceptions import ApiException
from app.core.logging_config import get_logger
from app.core.oauth_helper import ensure_https as _ensure_https
from app.core.oauth_helper import poll_device_auth as poll_oauth_future
from app.core.oauth_helper import start_device_auth as create_oauth_session
from app.core.tidal import TidalDownloader

from .schemas import (
    DeviceAuthInitResponse,
    DeviceAuthPollResponse,
    PkceStartResponse,
    PkceStatusResponse,
    SessionInfo,
    SessionListResponse,
    SessionStatusResponse,
    UserOut,
)

# Ventana para completar el login PKCE (el código de Tidal vive ~2 min; se da
# margen para que el usuario copie la URL de la página "Oops").
_PKCE_PENDING_TTL = 300

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
            # Gate de ban en el propio login (esta ruta no pasa por get_current_user):
            # un usuario baneado no obtiene cookie ni tokens nuevos.
            if uid and await bans.is_banned(redis, uid):
                del pending_v2[device_code]
                app_state.pending_oauth = None
                raise ApiException(
                    "ACCOUNT_BANNED",
                    "Tu cuenta ha sido suspendida y no puede iniciar sesión.",
                    403,
                    retriable=False,
                )
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

    # ── PKCE: segunda sesión Tidal para 16-bit LOSSLESS (Fase 5) ─────────────
    async def start_pkce(self, app_state: object, uid: str) -> PkceStartResponse:
        """Inicia el login PKCE web y devuelve la URL que el usuario debe abrir.

        La ``tidalapi.Session`` (con su ``code_verifier``) se guarda en memoria
        keyed por ``uid`` hasta que el usuario complete el flujo (mismo patrón
        in-memory que el device flow, `pending_oauth_v2`; ok con 1 réplica).
        """
        session = tidalapi.Session()
        login_url = await asyncio.to_thread(session.pkce_login_url)

        if not hasattr(app_state, "pending_pkce"):
            app_state.pending_pkce = {}  # type: ignore[attr-defined]
        pending: dict = app_state.pending_pkce  # type: ignore[attr-defined]
        # Poda de flujos abandonados (nadie los completa ni cancela).
        now = time.monotonic()
        for stale in [u for u, e in pending.items() if e.get("expires_at", 0) < now]:
            pending.pop(stale, None)
        pending[uid] = {"session": session, "expires_at": now + _PKCE_PENDING_TTL}

        return PkceStartResponse(login_url=_ensure_https(login_url))

    async def complete_pkce(
        self, app_state: object, uid: str, redirect_url: str
    ) -> PkceStatusResponse:
        """Canjea el código de la URL pegada y guarda la sesión PKCE del usuario.

        Verifica que la cuenta Tidal logueada por PKCE es la MISMA que la de la
        sesión de app (un usuario no puede colgar tokens de otra cuenta).
        """
        pending: dict = getattr(app_state, "pending_pkce", {})
        entry = pending.get(uid)
        if entry is None or entry.get("expires_at", 0) < time.monotonic():
            pending.pop(uid, None)
            raise ApiException(
                "PKCE_NOT_STARTED",
                "No hay un login Hi-Fi en curso o ya expiró. Vuelve a iniciarlo.",
                400,
                retriable=False,
            )
        session: tidalapi.Session = entry["session"]

        try:
            token = await asyncio.to_thread(session.pkce_get_auth_token, redirect_url)
            await asyncio.to_thread(lambda: session.process_auth_token(token, is_pkce_token=True))
            logged_in = await asyncio.to_thread(session.check_login)
        except Exception as exc:
            pending.pop(uid, None)
            raise ApiException(
                "PKCE_EXCHANGE_FAILED",
                f"No se pudo completar el login Hi-Fi: {exc}",
                400,
                retriable=False,
            ) from exc

        if not logged_in:
            pending.pop(uid, None)
            raise ApiException(
                "PKCE_EXCHANGE_FAILED", "El login Hi-Fi no quedó activo.", 400, retriable=False
            )

        pkce_uid = us.user_id_from_session(session)
        if pkce_uid is not None and str(pkce_uid) != str(uid):
            pending.pop(uid, None)
            raise ApiException(
                "PKCE_WRONG_ACCOUNT",
                "Esa cuenta de Tidal no coincide con la de tu sesión.",
                403,
                retriable=False,
            )

        token_data = us.token_data_from_session(session)
        await us.store_user_tokens(app_state.redis, uid, "pkce", token_data)  # type: ignore[attr-defined]
        pending.pop(uid, None)
        return PkceStatusResponse(connected=True)

    async def pkce_status(self, redis, uid: str) -> PkceStatusResponse:
        tokens = await us.get_user_tokens(redis, uid, "pkce")
        return PkceStatusResponse(connected=tokens is not None)

    async def disconnect_pkce(self, redis, uid: str, registry=None) -> PkceStatusResponse:
        """Borra los tokens PKCE del usuario y descarta su motor Hi-Fi cacheado.

        Sin invalidar el motor, un motor PKCE ya construido seguiría en memoria
        (con sus tokens) hasta la evicción por TTL, permitiendo descargas 16-bit
        tras la desconexión. `registry` es opcional para no acoplar la capa de
        datos al registro en los tests.
        """
        await us.delete_user_tokens(redis, uid, "pkce")
        if registry is not None:
            await registry.invalidate(uid, "pkce")
        return PkceStatusResponse(connected=False)

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
