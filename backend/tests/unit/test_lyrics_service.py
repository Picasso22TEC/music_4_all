"""Unit tests for TidalDownloader._fetch_lyrics and the @retry decorator.

Las llamadas a la API de LRCLib (https://lrclib.net/api/get) se interceptan
con la librería `responses`, por lo que estas pruebas no requieren red ni
credenciales de Tidal.
"""

from __future__ import annotations

from urllib.parse import parse_qs, urlparse

import pytest
import requests
import responses

from app.core.tidal import TidalDownloader, retry

LRCLIB_URL = "https://lrclib.net/api/get"


@pytest.fixture
def downloader():
    dl = TidalDownloader(log_callback=lambda *a, **k: None, session_data=None)
    yield dl
    dl._cleanup_temp_dir()


def _query_params(call) -> dict:
    return parse_qs(urlparse(call.request.url).query)


# ─── @retry decorator ──────────────────────────────────────────────────────


class TestRetryDecorator:
    def test_retries_on_connection_error_then_succeeds(self, monkeypatch):
        sleeps: list[float] = []
        monkeypatch.setattr("app.core.tidal.time.sleep", lambda s: sleeps.append(s))

        calls = {"count": 0}

        @retry(max_retries=3, backoff_factor=1.5)
        def flaky():
            calls["count"] += 1
            if calls["count"] < 3:
                raise requests.exceptions.ConnectionError("boom")
            return "ok"

        assert flaky() == "ok"
        assert calls["count"] == 3
        assert len(sleeps) == 2

    def test_raises_after_exhausting_retries(self, monkeypatch):
        monkeypatch.setattr("app.core.tidal.time.sleep", lambda s: None)

        @retry(max_retries=2, backoff_factor=1.5)
        def always_fails():
            raise requests.exceptions.ConnectionError("boom")

        with pytest.raises(requests.exceptions.ConnectionError):
            always_fails()

    def test_cancel_event_set_raises_runtime_warning(self, monkeypatch):
        import threading

        monkeypatch.setattr("app.core.tidal.time.sleep", lambda s: None)
        cancel_event = threading.Event()
        cancel_event.set()

        @retry(max_retries=3)
        def func(cancel_event=None):
            return "should-not-run"

        with pytest.raises(RuntimeWarning):
            func(cancel_event=cancel_event)


# ─── _fetch_lyrics: caso feliz ──────────────────────────────────────────────


class TestFetchLyricsHappyPath:
    @responses.activate
    def test_synced_lyrics_found(self, downloader):
        responses.add(
            responses.GET,
            LRCLIB_URL,
            json={"syncedLyrics": "[00:01.00]Hello world", "plainLyrics": "Hello world"},
            status=200,
        )

        synced, plain = downloader._fetch_lyrics("Test Artist", "Yesterday")

        assert synced == "[00:01.00]Hello world"
        assert plain == ""

    @responses.activate
    def test_only_plain_lyrics_found(self, downloader):
        responses.add(
            responses.GET,
            LRCLIB_URL,
            json={"syncedLyrics": "", "plainLyrics": "Hello world"},
            status=200,
        )

        synced, plain = downloader._fetch_lyrics("Test Artist", "Yesterday")

        assert synced == ""
        assert plain == "Hello world"


# ─── _fetch_lyrics: fallback al título original ────────────────────────────


class TestFetchLyricsFallback:
    @responses.activate
    def test_fallback_to_original_title_when_clean_title_has_no_lyrics(self, downloader):
        track_name = "Bohemian Rhapsody (Live)"

        # Primer intento: título "limpio" ("Bohemian Rhapsody") sin resultados.
        responses.add(
            responses.GET,
            LRCLIB_URL,
            json={"syncedLyrics": "", "plainLyrics": ""},
            status=200,
        )
        # Segundo intento: título original, con letras.
        responses.add(
            responses.GET,
            LRCLIB_URL,
            json={"syncedLyrics": "[00:00.00]Is this the real life", "plainLyrics": ""},
            status=200,
        )

        synced, plain = downloader._fetch_lyrics("Queen", track_name)

        assert synced == "[00:00.00]Is this the real life"
        assert plain == ""
        assert len(responses.calls) == 2

        first_params = _query_params(responses.calls[0])
        second_params = _query_params(responses.calls[1])
        assert first_params["track_name"][0] == "Bohemian Rhapsody"
        assert second_params["track_name"][0] == track_name


# ─── _fetch_lyrics: timeout ─────────────────────────────────────────────────


class TestFetchLyricsTimeout:
    @responses.activate
    def test_timeout_returns_empty_tuple(self, downloader):
        responses.add(
            responses.GET,
            LRCLIB_URL,
            body=requests.exceptions.Timeout("LRCLib no respondió"),
        )

        result = downloader._fetch_lyrics("Test Artist", "Yesterday")

        assert result == ("", "")


# ─── _fetch_lyrics: HTTP 404 ─────────────────────────────────────────────────


class TestFetchLyrics404:
    @responses.activate
    def test_404_returns_empty_tuple(self, downloader):
        responses.add(responses.GET, LRCLIB_URL, status=404)

        result = downloader._fetch_lyrics("Test Artist", "Unknown Song")

        assert result == ("", "")
