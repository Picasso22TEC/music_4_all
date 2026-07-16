"""
Integration tests for /ws/downloads (RM-01).

Covers:
    1. Valid auth   — connection accepted
    2. Auth failure — connection closed with code 1008
    3. Heartbeat    — client ping → server pong
    4. Relay        — Redis pubsub message → transformed spec message delivered
    5. Cleanup      — pubsub.unsubscribe + aclose called on disconnect
"""

from __future__ import annotations

import asyncio
import json
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.main import app

# ─── Mock factories ───────────────────────────────────────────────────────────


def _make_pubsub(messages: list[dict] | None = None) -> MagicMock:
    """Pubsub mock: get_message() returns each queued message once, then None.

    Mirrors redis-py's ``PubSub.get_message(timeout=…)`` which returns ``None``
    on an idle tick (no message) rather than raising — the poll pattern the
    relay relies on to survive quiet periods.
    """
    ps = MagicMock()
    ps.subscribe = AsyncMock()
    ps.unsubscribe = AsyncMock()
    ps.aclose = AsyncMock()

    msg_list = list(messages or [])

    async def _get_message(
        ignore_subscribe_messages: bool = False, timeout: float | None = None
    ) -> dict | None:
        if msg_list:
            return msg_list.pop(0)
        # Idle tick: yield control so the socket send/receive can proceed.
        await asyncio.sleep(0.01)
        return None

    ps.get_message = _get_message
    return ps


def _make_redis(ps: MagicMock) -> MagicMock:
    r = MagicMock()
    r.pubsub = MagicMock(return_value=ps)
    return r


def _make_engine(*, authenticated: bool = True) -> MagicMock:
    e = MagicMock()
    # check_auth is sync — called via asyncio.to_thread in the handler
    e.check_auth = MagicMock(return_value=authenticated)
    return e


def _setup(
    *,
    authenticated: bool = True,
    messages: list[dict] | None = None,
) -> tuple[TestClient, MagicMock]:
    """Configure app.state mocks and return (TestClient, pubsub_mock)."""
    ps = _make_pubsub(messages)
    app.state.engine = _make_engine(authenticated=authenticated)
    app.state.redis = _make_redis(ps)
    return TestClient(app), ps


# ─── 1. Valid connection ──────────────────────────────────────────────────────


class TestConnection:
    def test_authenticated_client_connects(self) -> None:
        client, _ = _setup(authenticated=True)
        with client.websocket_connect("/ws/downloads"):
            pass  # accept() reached — no exception means success

    def test_unauthenticated_client_closed_1008(self) -> None:
        client, _ = _setup(authenticated=False)
        close_code: int | None = None
        with client.websocket_connect("/ws/downloads") as ws:
            try:
                ws.receive_json()
            except WebSocketDisconnect as exc:
                close_code = exc.code
        assert close_code == 1008


# ─── 3. Heartbeat ─────────────────────────────────────────────────────────────


class TestHeartbeat:
    def test_client_ping_receives_pong(self) -> None:
        client, _ = _setup()
        with client.websocket_connect("/ws/downloads") as ws:
            ws.send_json({"type": "ping"})
            msg = ws.receive_json()
        assert msg["type"] == "pong"
        assert isinstance(msg["timestamp"], int)
        assert msg["timestamp"] > 0


# ─── 4. Redis relay ───────────────────────────────────────────────────────────


class TestRelay:
    def test_progress_message_transformed_and_delivered(self) -> None:
        flat = {
            "type": "message",
            "data": json.dumps(
                {
                    "job_id": "abc-123",
                    "status": "downloading",
                    "progress": 55.0,
                    "title": "Test Album",
                }
            ),
        }
        client, _ = _setup(messages=[flat])
        with client.websocket_connect("/ws/downloads") as ws:
            msg = ws.receive_json()
        assert msg["type"] == "progress"
        assert msg["job_id"] == "abc-123"
        payload = msg["payload"]
        assert payload["progress_percent"] == pytest.approx(55.0)

    def test_job_started_message_relayed(self) -> None:
        flat = {
            "type": "message",
            "data": json.dumps(
                {
                    "job_id": "abc-789",
                    "title": "Test Album",
                    "status": "started",
                    "started_at": "2024-06-01T12:00:00+00:00",
                }
            ),
        }
        client, _ = _setup(messages=[flat])
        with client.websocket_connect("/ws/downloads") as ws:
            msg = ws.receive_json()
        assert msg["type"] == "job_started"
        assert msg["job_id"] == "abc-789"
        assert msg["payload"]["started_at"] == "2024-06-01T12:00:00+00:00"

    def test_enriched_progress_fields_delivered(self) -> None:
        flat = {
            "type": "message",
            "data": json.dumps(
                {
                    "job_id": "enr-001",
                    "status": "downloading",
                    "progress": 60.0,
                    "title": "OK Computer",
                    "current_track_filename": "03 - Karma Police.flac",
                    "completed_tracks": 2,
                    "total_tracks": 10,
                    "speed_mbps": 0.0,
                    "eta_seconds": 45,
                }
            ),
        }
        client, _ = _setup(messages=[flat])
        with client.websocket_connect("/ws/downloads") as ws:
            msg = ws.receive_json()
        assert msg["type"] == "progress"
        payload = msg["payload"]
        assert payload["current_track_filename"] == "03 - Karma Police.flac"
        assert payload["completed_tracks"] == 2
        assert payload["total_tracks"] == 10
        assert payload["eta_seconds"] == 45

    def test_unknown_status_dropped_not_delivered(self) -> None:
        # flat_to_spec_message returns None for unknown status → relay drops it
        flat = {
            "type": "message",
            "data": json.dumps(
                {
                    "job_id": "abc-456",
                    "status": "unknown_status",
                    "progress": 0.0,
                }
            ),
        }
        client, _ = _setup(messages=[flat])
        with client.websocket_connect("/ws/downloads") as ws:
            # No relay message arrives; send a ping to get a known response
            ws.send_json({"type": "ping"})
            msg = ws.receive_json()
        assert msg["type"] == "pong"


# ─── 5. Cleanup ───────────────────────────────────────────────────────────────


class TestCleanup:
    def test_pubsub_unsubscribed_on_disconnect(self) -> None:
        client, ps = _setup()
        with client.websocket_connect("/ws/downloads"):
            pass
        ps.unsubscribe.assert_awaited_once()
        ps.aclose.assert_awaited_once()


# ─── 6. Aislamiento multiusuario (filtrado por user_id) ───────────────────────


def _progress_msg(job_id: str, user_id: str) -> dict:
    return {
        "type": "message",
        "data": json.dumps(
            {
                "job_id": job_id,
                "status": "downloading",
                "progress": 50.0,
                "title": "Album",
                "user_id": user_id,
            }
        ),
    }


class TestUserIsolation:
    def _setup_with_session(self, uid: str, messages: list[dict]) -> TestClient:
        """Cliente con cookie de sesión que resuelve a `uid` (get_app_session mockeado)."""
        import time

        ps = _make_pubsub(messages)
        redis = _make_redis(ps)
        # get_app_session: redis.get(app:session:sid) → sesión válida del usuario `uid`.
        session_json = json.dumps(
            {"tidal_user_id": uid, "abs_exp": time.time() + 3600, "last_seen": time.time()}
        )
        redis.get = AsyncMock(return_value=session_json)
        redis.setex = AsyncMock()
        app.state.engine = _make_engine(authenticated=True)
        app.state.redis = redis
        client = TestClient(app)
        client.cookies.set("m4a_sid", "sid-u1")
        return client

    def test_only_own_jobs_delivered(self) -> None:
        # u2 primero (debe descartarse), luego u1 (debe entregarse).
        client = self._setup_with_session(
            "u1", [_progress_msg("job-of-u2", "u2"), _progress_msg("job-of-u1", "u1")]
        )
        with client.websocket_connect("/ws/downloads") as ws:
            msg = ws.receive_json()
        assert msg["type"] == "progress"
        assert msg["job_id"] == "job-of-u1"  # el de u2 fue filtrado

    def test_invalid_session_cookie_closed_1008(self) -> None:
        ps = _make_pubsub([])
        redis = _make_redis(ps)
        redis.get = AsyncMock(return_value=None)  # sesión inexistente/expirada
        app.state.engine = _make_engine(authenticated=True)
        app.state.redis = redis
        client = TestClient(app)
        client.cookies.set("m4a_sid", "bad-sid")
        close_code: int | None = None
        with client.websocket_connect("/ws/downloads") as ws:
            try:
                ws.receive_json()
            except WebSocketDisconnect as exc:
                close_code = exc.code
        assert close_code == 1008
