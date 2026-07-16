"""Tests de dependencias de identidad + guardia anti-IDOR (app/dependencies.py)."""

from __future__ import annotations

from types import SimpleNamespace

import fakeredis.aioredis
import pytest

from app.core import redis_client as rc
from app.core import user_session as us
from app.core.exceptions import ApiException
from app.dependencies import (
    CurrentUser,
    assert_job_owner,
    get_current_user,
    get_current_user_optional,
)


@pytest.fixture
async def redis():
    client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    yield client
    await client.aclose()


def _request(redis, cookies: dict[str, str] | None = None):
    return SimpleNamespace(
        cookies=cookies or {},
        app=SimpleNamespace(state=SimpleNamespace(redis=redis)),
    )


# ── get_current_user(_optional) ───────────────────────────────────────────────
async def test_optional_none_without_cookie(redis):
    assert await get_current_user_optional(_request(redis)) is None


async def test_optional_none_with_invalid_sid(redis):
    req = _request(redis, {"m4a_sid": "does-not-exist"})
    assert await get_current_user_optional(req) is None


async def test_optional_returns_user_for_valid_session(redis):
    sid = await us.create_app_session(redis, "user-42")
    req = _request(redis, {"m4a_sid": sid})
    user = await get_current_user_optional(req)
    assert user is not None
    assert user.tidal_user_id == "user-42"
    assert user.sid == sid


async def test_required_raises_401_without_session(redis):
    with pytest.raises(ApiException) as exc:
        await get_current_user(_request(redis))
    assert exc.value.http_status == 401


async def test_required_returns_user_with_session(redis):
    sid = await us.create_app_session(redis, "user-7")
    user = await get_current_user(_request(redis, {"m4a_sid": sid}))
    assert user.tidal_user_id == "user-7"


# ── assert_job_owner (anti-IDOR) ──────────────────────────────────────────────
async def test_owner_404_when_missing(redis):
    user = CurrentUser(tidal_user_id="u1", sid="s1")
    with pytest.raises(ApiException) as exc:
        await assert_job_owner(redis, "nope", user)
    assert exc.value.http_status == 404


async def test_owner_ok_when_matches(redis):
    await rc.set_job_state(redis, "job-1", {"job_id": "job-1", "user_id": "u1", "status": "queued"})
    user = CurrentUser(tidal_user_id="u1", sid="s1")
    job = await assert_job_owner(redis, "job-1", user)
    assert job["job_id"] == "job-1"


async def test_owner_403_for_other_user(redis):
    await rc.set_job_state(redis, "job-2", {"job_id": "job-2", "user_id": "owner", "status": "x"})
    intruder = CurrentUser(tidal_user_id="intruder", sid="s2")
    with pytest.raises(ApiException) as exc:
        await assert_job_owner(redis, "job-2", intruder)
    assert exc.value.http_status == 403


async def test_owner_allows_legacy_job_without_user_id(redis):
    # Jobs anteriores a la migración (sin user_id) siguen accesibles (transición).
    await rc.set_job_state(redis, "job-3", {"job_id": "job-3", "status": "queued"})
    user = CurrentUser(tidal_user_id="whoever", sid="s3")
    job = await assert_job_owner(redis, "job-3", user)
    assert job["job_id"] == "job-3"
