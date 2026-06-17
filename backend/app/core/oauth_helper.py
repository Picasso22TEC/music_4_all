"""Helpers compartidos para el flujo de Tidal Device Authorization (OAuth).

`app/modules/auth/service.py` (legacy, `/auth/*`) y
`app/modules/session/service.py` (v2, `/session/*`) implementan el mismo
ciclo de vida de device-auth contra dos estructuras de estado en memoria
distintas (`app.state.pending_oauth` / `pending_oauth_v2`). Este módulo
centraliza la parte que **no** depende de `app.state` — creación de la
sesión de Tidal y normalización de URL — para que un fix como
`_ensure_https` no vuelva a aplicarse solo a uno de los dos flujos (ver
TD-14 en `docs/audits/TECHNICAL_AUDIT.md`). El almacenamiento del estado
pendiente sigue a cargo de cada módulo llamante.
"""

from __future__ import annotations

import asyncio
from concurrent.futures import Future

import tidalapi
from tidalapi.session import LinkLogin

#: Fallback de `link.expires_in` cuando Tidal no lo informa (no ocurre en la
#: práctica — `LinkLogin` siempre lo construye desde la respuesta JSON — pero
#: se mantiene como salvaguarda defensiva, igual que el código original).
DEFAULT_DEVICE_AUTH_TIMEOUT = 300


def ensure_https(url: str) -> str:
    """Prepend https:// a una URL sin esquema.

    Tidal's Device Authorization API a veces devuelve hostnames sin esquema
    (ej. 'link.tidal.com/ABCDE'). Sin esquema, el navegador trata el valor
    como un path relativo y el usuario termina en un 404. http:// se
    preserva tal cual para no romper entornos locales/dev.
    """
    url = url.strip()
    if not url:
        return ""
    if url.startswith("http://") or url.startswith("https://"):
        return url
    return f"https://{url}"


async def start_device_auth(
    timeout: int = DEFAULT_DEVICE_AUTH_TIMEOUT,
) -> tuple[tidalapi.Session, LinkLogin, Future[bool]]:
    """Crea una sesión de Tidal e inicia el Device Authorization Flow.

    Devuelve `(session, link, future)`: `link` trae `verification_uri`,
    `user_code`, etc. necesarios para construir la respuesta al cliente, y
    `future` se resuelve cuando el usuario autoriza (o el link expira).
    `timeout` solo se usa como fallback de `link.expires_in`.
    """
    session = tidalapi.Session()
    link, future = await asyncio.to_thread(session.login_oauth)
    if getattr(link, "expires_in", None) is None:
        link.expires_in = timeout
    return session, link, future


async def poll_device_auth(session: tidalapi.Session, future: Future[bool]) -> bool | None:
    """Consulta el estado de un device-auth en curso.

    Devuelve `None` si `future` aún no se resolvió. Una vez resuelto,
    devuelve el resultado de `session.check_login()` (`True` si la
    autorización tuvo éxito; `False` si falló, expiró, o `check_login()`
    lanzó una excepción).
    """
    if not future.done():
        return None
    try:
        return bool(await asyncio.to_thread(session.check_login))
    except Exception:
        return False
