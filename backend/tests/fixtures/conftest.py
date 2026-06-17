"""Fixtures reutilizables para todas las pruebas."""

from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def api_client():
    """Cliente HTTP para pruebas de FastAPI."""
    return TestClient(app)


@pytest.fixture
def tidal_session_mock():
    """Sesión de Tidal simulada."""
    session = Mock()
    session.check_login.return_value = True
    session.token_type = "Bearer"
    session.access_token = "test_token_12345"
    session.refresh_token = "test_refresh_67890"
    return session


@pytest.fixture
def sample_track():
    """Track de prueba."""
    track = Mock()
    track.id = 123456789
    track.name = "Test Track"
    track.artist = Mock(name="Test Artist")
    track.album = Mock(id=987654321, name="Test Album")
    track.track_num = 1
    track.duration = 180
    return track


@pytest.fixture
def sample_album():
    """Album de prueba."""
    album = Mock()
    album.id = 987654321
    album.name = "Test Album"
    album.artist = Mock(name="Test Artist")
    album.num_tracks = 10
    album.release_date = "2023-01-01"
    album.cover = "test-cover-id"
    return album


@pytest.fixture
def sample_metadata():
    """Metadata simulada de API."""
    return {
        "type": "track",
        "title": "Test Track",
        "artist": "Test Artist",
        "items": [
            {
                "id": 123456789,
                "name": "Test Track",
                "artist": {"name": "Test Artist"},
                "album": {"id": 987654321},
            }
        ],
        "folder": "Test Artist - Test Album",
        "year": "2023",
        "quality_badge": "HIFI",
        "quality_desc": "44.1kHz / 16bit",
    }


@pytest.fixture
def sample_download_job():
    """Job de descarga simulado."""
    return {
        "job_id": "job-test-12345",
        "status": "downloading",
        "progress": 0.45,
        "queue_position": 2,
        "eta_seconds": 120.5,
        "result_path": None,
        "quality_text": "FLAC 48kHz/24bit",
        "sample_rate": 48000,
        "bit_depth": 24,
        "error": None,
    }
