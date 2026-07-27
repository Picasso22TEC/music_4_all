"""Tests para GET /search — resultados de artista con foto (B1/B3)."""

from __future__ import annotations

from types import SimpleNamespace

import tidalapi.exceptions as tidal_exc

from app.main import app


def _mock_artist() -> SimpleNamespace:
    return SimpleNamespace(id=100, name="Test Artist", picture="pic-uuid")


def test_search_returns_artists_with_picture(api_client_with_state):
    client = api_client_with_state
    app.state.engine.session.search.return_value = {
        "artists": [_mock_artist()],
        "albums": [],
        "tracks": [],
        "playlists": [],
    }

    resp = client.get("/search", params={"q": "test", "limit": 10})

    assert resp.status_code == 200
    body = resp.json()
    assert "artists" in body
    assert len(body["artists"]["items"]) == 1
    artist = body["artists"]["items"][0]
    assert artist["id"] == "100"
    assert artist["name"] == "Test Artist"
    assert artist["picture"].startswith("https://resources.tidal.com/images/")


def test_search_without_artists_returns_empty_artist_list(api_client_with_state):
    client = api_client_with_state
    app.state.engine.session.search.return_value = {
        "artists": [],
        "albums": [],
        "tracks": [],
        "playlists": [],
    }

    resp = client.get("/search", params={"q": "test"})

    assert resp.status_code == 200
    assert resp.json()["artists"]["items"] == []


def test_search_rate_limited_becomes_503_tidal_busy(api_client_with_state):
    """Un 429 de Tidal debe salir como 503 TIDAL_BUSY (circuit breaker, Fase 4),
    no re-envuelto en 500 por el `except Exception` del router."""
    client = api_client_with_state
    app.state.engine.session.search.side_effect = tidal_exc.TooManyRequests("slow down")

    resp = client.get("/search", params={"q": "test"})

    assert resp.status_code == 503
    assert resp.json()["error"]["code"] == "TIDAL_BUSY"
