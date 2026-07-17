"""El timeout de inactividad debe medir inactividad de verdad.

Regresión: el TTL idle se renovaba en **cada** petición, y el frontend refresca el
historial cada 30 s por su cuenta. Con una pestaña abierta, la app renovaba la
sesión sola para siempre y el timeout no llegaba a cumplirse nunca — justo el
escenario que debe cubrir (el usuario se levanta y deja la sesión abierta).
"""

from __future__ import annotations

from types import SimpleNamespace

import fakeredis.aioredis
import pytest

from app.config import settings
from app.core import user_session as us
from app.dependencies import BACKGROUND_REQUEST_HEADER, get_current_user_optional

_KEY = "app:session:{sid}"


@pytest.fixture
async def redis():
    client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    yield client
    await client.aclose()


def _request(redis, sid: str, *, background: bool = False):
    headers = {BACKGROUND_REQUEST_HEADER: "1"} if background else {}
    return SimpleNamespace(
        cookies={"m4a_sid": sid},
        headers=headers,
        state=SimpleNamespace(),
        app=SimpleNamespace(state=SimpleNamespace(redis=redis)),
    )


async def _ttl(redis, sid: str) -> int:
    return await redis.ttl(_KEY.format(sid=sid))


# ── get_app_session(touch=...) ───────────────────────────────────────────────
async def test_reading_a_session_renews_its_ttl_by_default(redis):
    sid = await us.create_app_session(redis, "u1")
    await redis.expire(_KEY.format(sid=sid), 100)  # simula tiempo transcurrido

    await us.get_app_session(redis, sid)

    assert await _ttl(redis, sid) > 100  # deslizante: vuelve al TTL completo


async def test_background_read_does_not_renew_the_ttl(redis):
    sid = await us.create_app_session(redis, "u1")
    await redis.expire(_KEY.format(sid=sid), 100)

    data = await us.get_app_session(redis, sid, touch=False)

    assert data is not None  # la sesión sigue siendo válida y usable
    assert await _ttl(redis, sid) <= 100  # pero no se ha regalado tiempo


async def test_background_read_still_enforces_the_absolute_expiry(redis):
    sid = await us.create_app_session(redis, "u1")
    raw = await redis.get(_KEY.format(sid=sid))
    import json

    data = json.loads(raw)
    data["abs_exp"] = 0  # sesión pasada de su tope absoluto
    await redis.set(_KEY.format(sid=sid), json.dumps(data))

    assert await us.get_app_session(redis, sid, touch=False) is None
    assert await redis.get(_KEY.format(sid=sid)) is None  # y queda borrada


# ── La dependencia lee la cabecera ───────────────────────────────────────────
async def test_normal_request_counts_as_activity(redis):
    sid = await us.create_app_session(redis, "u1")
    await redis.expire(_KEY.format(sid=sid), 100)

    user = await get_current_user_optional(_request(redis, sid))

    assert user is not None
    assert await _ttl(redis, sid) > 100


async def test_marked_background_request_does_not_keep_the_session_alive(redis):
    sid = await us.create_app_session(redis, "u1")
    await redis.expire(_KEY.format(sid=sid), 100)

    user = await get_current_user_optional(_request(redis, sid, background=True))

    assert user is not None  # la petición se atiende con normalidad
    assert await _ttl(redis, sid) <= 100  # sin renovar: el auto-refresco no es actividad


async def test_session_dies_after_repeated_background_requests(redis):
    """El caso real: la pestaña abierta refrescando el historial no salva la sesión."""
    sid = await us.create_app_session(redis, "u1")

    for _ in range(5):
        await get_current_user_optional(_request(redis, sid, background=True))

    # Simula que se agotó el TTL idle sin actividad real del usuario.
    await redis.delete(_KEY.format(sid=sid))
    assert await get_current_user_optional(_request(redis, sid)) is None


async def test_idle_ttl_setting_is_the_window_we_advertise():
    # El vigilante del navegador toma el plazo del servidor (/session/keepalive),
    # así que este ajuste es la única fuente de verdad.
    assert settings.session_idle_ttl == 1800
