"""Tests para GET /search — resultados de artista con foto (B1/B3)."""

from __future__ import annotations

from types import SimpleNamespace

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
