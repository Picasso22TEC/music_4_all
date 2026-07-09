"""Tests para GET /download/stream/{track_id} — proxy de streaming AAC."""

from __future__ import annotations

from unittest.mock import MagicMock

import app.modules.download.router as router_mod
from app.main import app


def _fake_upstream(status_code: int = 206) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status_code
    resp.headers = {
        "Content-Length": "10",
        "Content-Range": "bytes 0-9/100",
        "Accept-Ranges": "bytes",
    }
    resp.iter_content.return_value = iter([b"abc", b"defghij"])
    resp.raise_for_status.return_value = None
    return resp


def test_stream_proxies_audio_and_forwards_range(api_client_with_state, monkeypatch):
    client = api_client_with_state
    engine = app.state.engine
    engine.session.track.return_value = MagicMock()
    engine.get_stream_source.return_value = ("https://cdn.tidal.test/xyz.m4a", "DIRECT")

    upstream = _fake_upstream(206)
    get_mock = MagicMock(return_value=upstream)
    monkeypatch.setattr(router_mod.requests, "get", get_mock)

    resp = client.get("/download/stream/123", headers={"Range": "bytes=0-9"})

    assert resp.status_code == 206
    assert resp.headers["content-type"].startswith("audio/mp4")
    assert resp.headers["content-range"] == "bytes 0-9/100"
    assert resp.headers["accept-ranges"] == "bytes"
    assert resp.content == b"abcdefghij"

    # El Range entrante se reenvía a la CDN de Tidal.
    get_mock.assert_called_once()
    assert get_mock.call_args.kwargs["headers"]["Range"] == "bytes=0-9"
    engine.get_stream_source.assert_called_once()
    assert engine.get_stream_source.call_args.args[1] == "NORMAL"


def test_stream_without_range_returns_200(api_client_with_state, monkeypatch):
    client = api_client_with_state
    engine = app.state.engine
    engine.session.track.return_value = MagicMock()
    engine.get_stream_source.return_value = ("https://cdn.tidal.test/xyz.m4a", "DIRECT")
    monkeypatch.setattr(router_mod.requests, "get", MagicMock(return_value=_fake_upstream(200)))

    resp = client.get("/download/stream/123")
    assert resp.status_code == 200
    assert resp.content == b"abcdefghij"


def test_stream_unresolvable_returns_502(api_client_with_state):
    client = api_client_with_state
    engine = app.state.engine
    engine.session.track.return_value = MagicMock()
    engine.get_stream_source.return_value = (None, "Formato desconocido")

    resp = client.get("/download/stream/123")
    assert resp.status_code == 502


def test_stream_dash_only_returns_502(api_client_with_state):
    # Lossless (DASH segmentado) no es reproducible por <audio>: se rechaza.
    client = api_client_with_state
    engine = app.state.engine
    engine.session.track.return_value = MagicMock()
    engine.get_stream_source.return_value = ("https://cdn.tidal.test/media.mp4", "DASH")

    resp = client.get("/download/stream/123")
    assert resp.status_code == 502


def test_stream_invalid_track_id_returns_404(api_client_with_state):
    client = api_client_with_state
    resp = client.get("/download/stream/not-an-int")
    assert resp.status_code == 404
