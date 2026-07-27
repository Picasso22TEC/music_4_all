"""Tests para GET /search — resultados de artista con foto (B1/B3)."""

from __future__ import annotations

from types import SimpleNamespace

import tidalapi
import tidalapi.exceptions as tidal_exc

from app.main import app


def _mock_artist() -> SimpleNamespace:
    return SimpleNamespace(id=100, name="Test Artist", picture="pic-uuid")


class _FakeTrack(tidalapi.Track):
    """Instancia real de tidalapi.Track (para que `isinstance` en _top_hit_out la
    reconozca) pero sin sesión: el __init__ solo fija atributos sueltos."""

    def __init__(self, **attrs: object) -> None:
        for k, v in attrs.items():
            setattr(self, k, v)


class _FakeArtist(tidalapi.Artist):
    def __init__(self, **attrs: object) -> None:
        for k, v in attrs.items():
            setattr(self, k, v)


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


def test_search_without_top_hit_is_null(api_client_with_state):
    """Sin top_hit en la respuesta de tidalapi → top_hit=None (compat hacia atrás)."""
    client = api_client_with_state
    app.state.engine.session.search.return_value = {
        "artists": [],
        "albums": [],
        "tracks": [],
        "playlists": [],
    }

    resp = client.get("/search", params={"q": "test"})

    assert resp.status_code == 200
    assert resp.json()["top_hit"] is None


def test_search_captures_track_top_hit(api_client_with_state):
    """El top_hit de tidalapi se captura y se mapea según su tipo real."""
    client = api_client_with_state
    top = _FakeTrack(id=555, name="Best Match", track_num=3, duration=210)
    app.state.engine.session.search.return_value = {
        "artists": [],
        "albums": [],
        "tracks": [],
        "playlists": [],
        "top_hit": top,
    }

    resp = client.get("/search", params={"q": "best match"})

    assert resp.status_code == 200
    top_hit = resp.json()["top_hit"]
    assert top_hit is not None
    assert top_hit["type"] == "track"
    assert top_hit["track"]["id"] == "555"
    assert top_hit["track"]["title"] == "Best Match"
    # los otros campos van vacíos
    assert top_hit["artist"] is None and top_hit["album"] is None


def test_search_captures_artist_top_hit(api_client_with_state):
    client = api_client_with_state
    top = _FakeArtist(id=77, name="Top Band", picture="uuid-band")
    app.state.engine.session.search.return_value = {
        "artists": [],
        "albums": [],
        "tracks": [],
        "playlists": [],
        "top_hit": top,
    }

    resp = client.get("/search", params={"q": "top band"})

    assert resp.status_code == 200
    top_hit = resp.json()["top_hit"]
    assert top_hit["type"] == "artist"
    assert top_hit["artist"]["id"] == "77"
    assert top_hit["artist"]["picture"].startswith("https://resources.tidal.com/images/")


def test_search_rate_limited_becomes_503_tidal_busy(api_client_with_state):
    """Un 429 de Tidal debe salir como 503 TIDAL_BUSY (circuit breaker, Fase 4),
    no re-envuelto en 500 por el `except Exception` del router."""
    client = api_client_with_state
    app.state.engine.session.search.side_effect = tidal_exc.TooManyRequests("slow down")

    resp = client.get("/search", params={"q": "test"})

    assert resp.status_code == 503
    assert resp.json()["error"]["code"] == "TIDAL_BUSY"
