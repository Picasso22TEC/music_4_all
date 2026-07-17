"""Sesión de app por usuario + almacenamiento cifrado de tokens Tidal (multiusuario).

Modelo (Tidal como IdP): tras el login Tidal se emite una cookie de sesión propia
(``m4a_sid``) mapeada en Redis a un ``tidal_user_id``; los tokens Tidal se guardan
por usuario, **cifrados en reposo**. Este módulo es la capa de datos de la sesión
(Fase 1); no toca el flujo actual hasta que se cablee en auth/dependencias.

Claves Redis:
  ``app:session:{sid}``        -> JSON {tidal_user_id, created_at, last_seen, ip, ua, abs_exp}
  ``user:{uid}:tidal:{kind}``  -> token cifrado (kind: ``oauth`` device flow | ``pkce`` 16-bit)
  ``user:{uid}:sessions``      -> set de sids del usuario (panel de sesiones / revocar-todas)

Principios OWASP aplicados: id de sesión aleatorio ≥256-bit, TTL idle deslizante +
expiración absoluta, tokens solo en servidor y cifrados, revocación por logout.
"""

from __future__ import annotations

import base64
import hashlib
import json
import secrets
import time

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

_APP_SESSION = "app:session:{sid}"
_USER_TOKENS = "user:{uid}:tidal:{kind}"
_USER_SESSIONS = "user:{uid}:sessions"

# Clave efímera de dev: si no hay session_encryption_key en env, los tokens se cifran
# con esta clave por-proceso (no sobreviven al reinicio). En producción SIEMPRE setear
# session_encryption_key.
_EPHEMERAL_KEY = secrets.token_hex(32)
_warned_ephemeral = False


def _fernet() -> Fernet:
    global _warned_ephemeral
    key = settings.session_encryption_key
    if not key:
        if not _warned_ephemeral:
            logger.warning(
                "session_encryption_key vacía: usando clave efímera de dev "
                "(los tokens no sobreviven al reinicio). Setear en producción."
            )
            _warned_ephemeral = True
        key = _EPHEMERAL_KEY
    # Derivar una clave Fernet válida (32 bytes url-safe b64) desde cualquier string.
    digest = hashlib.sha256(key.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt(data: dict) -> str:
    """Cifra un dict (p.ej. tokens Tidal) a un string transportable."""
    return _fernet().encrypt(json.dumps(data).encode("utf-8")).decode("utf-8")


def decrypt(token: str) -> dict | None:
    """Descifra; devuelve None si el token es inválido/ilegible (clave rotada, corrupto)."""
    try:
        return json.loads(_fernet().decrypt(token.encode("utf-8")).decode("utf-8"))
    except (InvalidToken, ValueError, TypeError):
        return None


def new_sid() -> str:
    """Id de sesión aleatorio (~256 bits, url-safe)."""
    return secrets.token_urlsafe(32)


# --------------------------------------------------------------------------- #
# Serialización de una sesión Tidal → tokens (para almacenamiento por usuario)
# --------------------------------------------------------------------------- #
def token_data_from_session(session: object) -> dict:
    """Extrae los tokens de un ``tidalapi.Session`` ya autenticado a un dict.

    Mismo formato que ``TidalDownloader.get_session_data`` / el que consume
    ``TidalDownloader._load_session`` (``load_oauth_session``), pero leyendo los
    atributos directamente (sin la llamada de red de ``check_login``): se usa
    justo tras autorizar, cuando la sesión ya es válida.
    """
    expiry = getattr(session, "expiry_time", None)
    return {
        "token_type": getattr(session, "token_type", None),
        "access_token": getattr(session, "access_token", None),
        "refresh_token": getattr(session, "refresh_token", None),
        "expiry_time": expiry.isoformat() if expiry else "",
    }


def user_id_from_session(session: object) -> str | None:
    """Devuelve el id del usuario Tidal de una sesión, o None si no disponible."""
    user = getattr(session, "user", None)
    uid = getattr(user, "id", None) if user is not None else None
    return str(uid) if uid not in (None, "") else None


# --------------------------------------------------------------------------- #
# Sesión de app (cookie ↔ Redis)
# --------------------------------------------------------------------------- #
async def create_app_session(redis, tidal_user_id: str, ip: str = "", ua: str = "") -> str:
    """Crea una sesión de app para un usuario Tidal ya autenticado. Devuelve el sid.

    Regenerar el sid en cada login (llamar tras autenticar) mitiga session-fixation.
    """
    uid = str(tidal_user_id)
    sid = new_sid()
    now = time.time()
    data = {
        "tidal_user_id": uid,
        "created_at": now,
        "last_seen": now,
        "abs_exp": now + settings.session_absolute_ttl,
        "ip": ip,
        "ua": ua[:256],
    }
    await redis.setex(_APP_SESSION.format(sid=sid), settings.session_idle_ttl, json.dumps(data))
    await redis.sadd(_USER_SESSIONS.format(uid=uid), sid)
    return sid


async def get_app_session(redis, sid: str | None, touch: bool = True) -> dict | None:
    """Devuelve los datos de la sesión, o None si no es válida.

    Aplica expiración absoluta: si se superó ``abs_exp``, borra la sesión y devuelve None.

    ``touch=True`` refresca el TTL idle (sesión deslizante). Con ``touch=False`` la
    sesión se lee **sin** contar como actividad: lo usan las peticiones de fondo
    (p.ej. el auto-refresco del historial). Sin esa distinción el timeout de
    inactividad no se cumpliría nunca con una pestaña abierta, que es justo el
    escenario que debe cubrir (el usuario se va y deja la sesión abierta).
    """
    if not sid:
        return None
    raw = await redis.get(_APP_SESSION.format(sid=sid))
    if not raw:
        return None
    data = json.loads(raw)
    now = time.time()
    if now >= data.get("abs_exp", 0):
        await delete_app_session(redis, sid)
        return None
    if not touch:
        return data
    data["last_seen"] = now
    await redis.setex(_APP_SESSION.format(sid=sid), settings.session_idle_ttl, json.dumps(data))
    return data


async def delete_app_session(redis, sid: str) -> None:
    """Cierra una sesión (logout) y la quita del set del usuario."""
    raw = await redis.get(_APP_SESSION.format(sid=sid))
    if raw:
        uid = json.loads(raw).get("tidal_user_id")
        if uid:
            await redis.srem(_USER_SESSIONS.format(uid=uid), sid)
    await redis.delete(_APP_SESSION.format(sid=sid))


# --------------------------------------------------------------------------- #
# Tokens Tidal por usuario (cifrados)
# --------------------------------------------------------------------------- #
async def store_user_tokens(
    redis, tidal_user_id: str, kind: str, token_data: dict, ttl: int | None = None
) -> None:
    """Guarda (cifrados) los tokens Tidal de un usuario. kind: 'oauth' | 'pkce'."""
    key = _USER_TOKENS.format(uid=str(tidal_user_id), kind=kind)
    enc = encrypt(token_data)
    if ttl:
        await redis.setex(key, ttl, enc)
    else:
        await redis.set(key, enc)


async def get_user_tokens(redis, tidal_user_id: str, kind: str) -> dict | None:
    """Recupera y descifra los tokens Tidal de un usuario, o None si no hay/ilegible."""
    raw = await redis.get(_USER_TOKENS.format(uid=str(tidal_user_id), kind=kind))
    return decrypt(raw) if raw else None


async def delete_user_tokens(redis, tidal_user_id: str, kind: str) -> None:
    await redis.delete(_USER_TOKENS.format(uid=str(tidal_user_id), kind=kind))


# --------------------------------------------------------------------------- #
# Panel de sesiones activas (por usuario)
# --------------------------------------------------------------------------- #
async def list_user_sessions(redis, tidal_user_id: str) -> list[dict]:
    """Sesiones activas del usuario (para el panel). Poda las sids ya expiradas."""
    uid = str(tidal_user_id)
    sids = await redis.smembers(_USER_SESSIONS.format(uid=uid))
    out: list[dict] = []
    for sid in sids:
        raw = await redis.get(_APP_SESSION.format(sid=sid))
        if raw:
            data = json.loads(raw)
            data["sid"] = sid
            out.append(data)
        else:
            await redis.srem(_USER_SESSIONS.format(uid=uid), sid)
    return out


async def revoke_all_sessions(redis, tidal_user_id: str, keep_sid: str | None = None) -> int:
    """Cierra todas las sesiones del usuario (opcionalmente conservando keep_sid).

    Devuelve cuántas cerró. Útil para "cerrar sesión en todos los dispositivos".
    """
    uid = str(tidal_user_id)
    sids = await redis.smembers(_USER_SESSIONS.format(uid=uid))
    revoked = 0
    for sid in sids:
        if sid == keep_sid:
            continue
        await redis.delete(_APP_SESSION.format(sid=sid))
        await redis.srem(_USER_SESSIONS.format(uid=uid), sid)
        revoked += 1
    return revoked
