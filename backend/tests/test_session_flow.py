"""Flujo de sesión multiusuario: login emite cookie + tokens cifrados; logout y panel."""

from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta
from time import monotonic
from types import SimpleNamespace
from unittest.mock import AsyncMock

import fakeredis.aioredis
import pytest
from fastapi import Response

import app.modules.session.service as svc
from app.core import user_session as us
from app.modules.session.service import SessionService


@pytest.fixture
async def redis():
    client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    yield client
    await client.aclose()


def _authorized_session():
    return SimpleNamespace(
        user=SimpleNamespace(
            id=555,
            email="a@b.c",
            country_code="US",
            subscription=SimpleNamespace(type="HIFI"),
        ),
        token_type="Bearer",
        access_token="AT",
        refresh_token="RT",
        expiry_time=datetime.now(UTC) + timedelta(hours=1),
        country_code="US",
    )


def _fake_request(redis, device_code: str, session) -> SimpleNamespace:
    state = SimpleNamespace(
        redis=redis,
        pending_oauth_v2={
            device_code: {"session": session, "future": object(), "expires_at": monotonic() + 900}
        },
        pending_oauth={"session": session, "future": object()},
    )
    return SimpleNamespace(
        app=SimpleNamespace(state=state),
        client=SimpleNamespace(host="1.2.3.4"),
        headers={"user-agent": "pytest-agent"},
        cookies={},
    )


def _sid_from_cookie(response: Response) -> str:
    raw = response.headers.get("set-cookie", "")
    m = re.search(r"m4a_sid=([^;]+)", raw)
    assert m, f"no m4a_sid in Set-Cookie: {raw!r}"
    return m.group(1)


async def test_login_sets_cookie_and_encrypted_tokens(redis, monkeypatch):
    monkeypatch.setattr(svc, "poll_oauth_future", AsyncMock(return_value=True))
    session = _authorized_session()
    request = _fake_request(redis, "dc-1", session)
    response = Response()

    result = await SessionService().poll_device_auth("dc-1", request, response)

    assert result.status == "authorized"
    assert result.user is not None and result.user.id == "555"

    # Tokens del usuario, cifrados en reposo.
    stored = await us.get_user_tokens(redis, "555", "oauth")
    assert stored == {
        "token_type": "Bearer",
        "access_token": "AT",
        "refresh_token": "RT",
        "expiry_time": session.expiry_time.isoformat(),
    }
    raw = await redis.get("user:555:tidal:oauth")
    assert "AT" not in raw  # no en claro

    # Cookie httpOnly emitida y sesión de app resoluble.
    cookie = response.headers.get("set-cookie", "")
    assert "httponly" in cookie.lower()
    sid = _sid_from_cookie(response)
    data = await us.get_app_session(redis, sid)
    assert data is not None and data["tidal_user_id"] == "555"


async def test_logout_clears_session_and_cookie(redis):
    sid = await us.create_app_session(redis, "555")
    response = Response()
    await SessionService().logout(redis, sid, response)
    assert await us.get_app_session(redis, sid) is None
    # delete_cookie fija max-age=0 (o expires en el pasado).
    cookie = response.headers.get("set-cookie", "").lower()
    assert "m4a_sid=" in cookie
    assert "max-age=0" in cookie or "expires=" in cookie


async def test_session_panel_list_and_revoke_others(redis):
    a = await us.create_app_session(redis, "u")
    b = await us.create_app_session(redis, "u")
    service = SessionService()

    listing = await service.list_sessions(redis, "u", current_sid=a)
    assert {s.sid for s in listing.sessions} == {a, b}
    assert sum(1 for s in listing.sessions if s.current) == 1

    result = await service.revoke_other_sessions(redis, "u", keep_sid=a)
    assert result["revoked"] == 1
    assert await us.get_app_session(redis, a) is not None
    assert await us.get_app_session(redis, b) is None


async def test_revoke_specific_session_only_if_owned(redis):
    mine = await us.create_app_session(redis, "u")
    other = await us.create_app_session(redis, "intruder")
    service = SessionService()

    # No puedo revocar una sesión que no es mía.
    assert (await service.revoke_session(redis, "u", other))["revoked"] == 0
    assert await us.get_app_session(redis, other) is not None

    assert (await service.revoke_session(redis, "u", mine))["revoked"] == 1
    assert await us.get_app_session(redis, mine) is None
