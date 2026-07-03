"""El worker debe propagar la calidad del job a engine.download_single_track.

Regresión del bug donde la calidad seleccionada (MASTER/HIRES/HIGH/NORMAL) se
guardaba y encolaba pero nunca se aplicaba a la descarga.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

import app.core.worker as worker
from app.core.job_controls import JobControlRegistry


def _async_session_factory():
    """Fabrica un session_factory cuyo `async with ...` entrega una sesión mock."""
    session = MagicMock()
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=session)
    cm.__aexit__ = AsyncMock(return_value=False)
    return MagicMock(return_value=cm)


@pytest.fixture
def patched_worker(monkeypatch: pytest.MonkeyPatch):
    """Aísla _process_job de Redis, Postgres y el repo de descarga."""
    # Redis: sin estado previo → sin pre-pausa/cancelación.
    monkeypatch.setattr(worker.rc, "get_job_state", AsyncMock(return_value=None))
    monkeypatch.setattr(worker.rc, "set_job_state", AsyncMock())
    monkeypatch.setattr(worker.rc, "publish_progress", AsyncMock())

    # Repo de descarga: un único track para no iterar de más.
    track = MagicMock()
    track.name = "Track One"
    track.artist.name = "Artista"
    track.album.cover = "abc-def"
    prepare_repo = MagicMock()
    prepare_repo.prepare.return_value = ("track", "123", [track], "Título", "Carpeta")
    monkeypatch.setattr(worker, "_download_repo", prepare_repo)

    # History repo: métodos async no-op.
    history_repo = MagicMock()
    history_repo.save_download = AsyncMock()
    history_repo.save_audit = AsyncMock()
    monkeypatch.setattr(worker, "_history_repo", history_repo)

    return track


async def test_process_job_passes_job_quality_to_download(patched_worker) -> None:
    engine = MagicMock()
    # (ok, path, quality_txt, sample_rate, bits)
    engine.download_single_track.return_value = (True, "/tmp/x.m4a", "AAC 320kbps", 44100, 16)

    job = {
        "job_id": "job-1",
        "url": "https://tidal.com/browse/track/123",
        "title": "Título",
        "quality": "NORMAL",
    }

    await worker._process_job(
        job,
        engine,
        redis=MagicMock(),
        session_factory=_async_session_factory(),
        job_controls=JobControlRegistry(),
    )

    engine.download_single_track.assert_called_once()
    # 5º argumento posicional = calidad del job.
    assert engine.download_single_track.call_args.args[4] == "NORMAL"


async def test_process_job_defaults_quality_when_missing(patched_worker) -> None:
    engine = MagicMock()
    engine.download_single_track.return_value = (True, "/tmp/x.flac", "44.1kHz / 16bit", 44100, 16)

    job = {
        "job_id": "job-2",
        "url": "https://tidal.com/browse/track/123",
        "title": "Título",
        # sin 'quality'
    }

    await worker._process_job(
        job,
        engine,
        redis=MagicMock(),
        session_factory=_async_session_factory(),
        job_controls=JobControlRegistry(),
    )

    assert engine.download_single_track.call_args.args[4] == "MASTER"
