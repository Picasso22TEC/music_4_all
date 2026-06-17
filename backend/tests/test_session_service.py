"""Unit tests for session/service.py — URL normalization and device auth flow."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.modules.session.service import SessionService, _ensure_https

# ─── _ensure_https ────────────────────────────────────────────────────────────


class TestEnsureHttps:
    def test_empty_string_returns_empty(self):
        assert _ensure_https("") == ""

    def test_whitespace_only_returns_empty(self):
        assert _ensure_https("   ") == ""

    def test_strips_surrounding_whitespace(self):
        assert _ensure_https("  link.tidal.com/ABC  ") == "https://link.tidal.com/ABC"

    def test_no_scheme_gets_https(self):
        assert _ensure_https("link.tidal.com/SNREI") == "https://link.tidal.com/SNREI"

    def test_bare_hostname_gets_https(self):
        assert _ensure_https("link.tidal.com") == "https://link.tidal.com"

    def test_already_https_unchanged(self):
        assert _ensure_https("https://link.tidal.com/ABC") == "https://link.tidal.com/ABC"

    def test_http_preserved(self):
        # http:// must not be upgraded — dev/proxy environments may use plain HTTP
        assert _ensure_https("http://link.tidal.com/ABC") == "http://link.tidal.com/ABC"

    def test_idempotent_on_repeated_calls(self):
        url = "link.tidal.com/XYZ"
        once = _ensure_https(url)
        twice = _ensure_https(once)
        assert once == twice == "https://link.tidal.com/XYZ"

    def test_tidal_activate_fallback(self):
        assert _ensure_https("tidal.com/activate") == "https://tidal.com/activate"


# ─── SessionService.start_device_auth ────────────────────────────────────────


def _make_link(
    *,
    device_code: str = "dev-code-123",
    user_code: str = "ABCDE",
    verification_uri: str = "link.tidal.com",
    verification_uri_complete: str = "link.tidal.com/ABCDE",
    expires_in: float = 300,
    interval: float = 2,
) -> MagicMock:
    link = MagicMock()
    link.device_code = device_code
    link.user_code = user_code
    link.verification_uri = verification_uri
    link.verification_uri_complete = verification_uri_complete
    link.expires_in = expires_in
    link.interval = interval
    return link


def _make_app_state() -> MagicMock:
    state = MagicMock()
    state.pending_oauth_v2 = {}
    state.pending_oauth = None
    return state


@pytest.mark.asyncio
class TestStartDeviceAuth:
    async def _call(self, link: MagicMock) -> object:
        app_state = _make_app_state()
        with (
            patch("app.core.oauth_helper.tidalapi.Session"),
            patch(
                "app.core.oauth_helper.asyncio.to_thread",
                new_callable=AsyncMock,
            ) as mock_thread,
        ):
            mock_thread.return_value = (link, MagicMock())
            return await SessionService().start_device_auth(app_state)

    async def test_bare_uri_gets_https(self):
        link = _make_link(
            verification_uri="link.tidal.com",
            verification_uri_complete="link.tidal.com/ABCDE",
        )
        result = await self._call(link)
        assert result.verification_uri == "https://link.tidal.com"
        assert result.verification_uri_complete == "https://link.tidal.com/ABCDE"

    async def test_already_https_uri_unchanged(self):
        link = _make_link(
            verification_uri="https://link.tidal.com",
            verification_uri_complete="https://link.tidal.com/ABCDE",
        )
        result = await self._call(link)
        assert result.verification_uri == "https://link.tidal.com"
        assert result.verification_uri_complete == "https://link.tidal.com/ABCDE"

    async def test_fallback_builds_complete_uri_when_absent(self):
        """If Tidal omits verification_uri_complete, service builds it."""
        link = _make_link(
            verification_uri="link.tidal.com",
            verification_uri_complete="",
            user_code="ZYXWV",
        )
        result = await self._call(link)
        assert result.verification_uri == "https://link.tidal.com"
        assert result.verification_uri_complete == "https://link.tidal.com/ZYXWV"

    async def test_all_fields_returned(self):
        link = _make_link(
            device_code="dc-abc",
            user_code="HELLO",
            verification_uri="link.tidal.com",
            verification_uri_complete="link.tidal.com/HELLO",
            expires_in=600,
            interval=3,
        )
        result = await self._call(link)
        assert result.device_code == "dc-abc"
        assert result.user_code == "HELLO"
        assert result.expires_in == 600
        assert result.interval == 3

    async def test_whitespace_uri_stripped(self):
        link = _make_link(
            verification_uri="  link.tidal.com  ",
            verification_uri_complete="  link.tidal.com/ABCDE  ",
        )
        result = await self._call(link)
        assert result.verification_uri == "https://link.tidal.com"
        assert result.verification_uri_complete == "https://link.tidal.com/ABCDE"
