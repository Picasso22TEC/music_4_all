"""Un job pausado no debe retener su slot del worker.

Regresión: la pausa esperaba dentro de la tarea que ya tenía el slot del semáforo
global, así que `max_concurrent_downloads` jobs pausados congelaban las descargas
de **todos** los usuarios (un usuario podía bloquear al resto pulsando pausa).

La pausa se simula por la vía real: `_process_job` crea su propio JobControl con
`register()`, así que no vale prepararlo desde fuera; lo que sí lee es el estado
del job en Redis, y un "paused" previo hace que se pause en el primer track.
"""

from __future__ import annotations

import asyncio
import time
from unittest.mock import AsyncMock, MagicMock

import pytest

import app.core.worker as worker
from app.core.job_controls import JobControlRegistry


def _async_session_factory():
    session = MagicMock()
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=session)
    cm.__aexit__ = AsyncMock(return_value=False)
    return MagicMock(return_value=cm)


@pytest.fixture
def patched_worker(monkeypatch: pytest.MonkeyPatch):
    """Aísla _process_job de Redis, Postgres y el repo de descarga."""
    monkeypatch.setattr(worker.rc, "get_job_state", AsyncMock(return_value=None))
    monkeypatch.setattr(worker.rc, "set_job_state", AsyncMock())
    monkeypatch.setattr(worker.rc, "publish_progress", AsyncMock())

    track = MagicMock()
    track.name = "Track One"
    track.artist.name = "Artista"
    track.album.cover = "abc-def"
    repo = MagicMock()
    repo.prepare.return_value = ("track", "123", [track], "Título", "Carpeta")
    monkeypatch.setattr(worker, "_download_repo", repo)

    history = MagicMock()
    history.save_download = AsyncMock()
    history.save_audit = AsyncMock()
    monkeypatch.setattr(worker, "_history_repo", history)
    return track


@pytest.fixture
def start_paused(monkeypatch: pytest.MonkeyPatch):
    """El job ya estaba pausado al llegar al worker → se pausa en el primer track."""
    monkeypatch.setattr(
        worker.rc, "get_job_state", AsyncMock(return_value={"spec_status": "paused"})
    )


def _engine():
    engine = MagicMock()
    engine.download_single_track.return_value = (True, "/tmp/x.flac", "FLAC", 44100, 16)
    return engine


async def _wait_until(predicate, timeout: float = 2.0) -> bool:
    """Espera a que se cumpla una condición (en vez de dormir un rato fijo y rezar)."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return True
        await asyncio.sleep(0.01)
    return predicate()


def _run(job_id: str, reg: JobControlRegistry, sem: asyncio.Semaphore):
    job = {"job_id": job_id, "url": "https://tidal.com/browse/track/123", "title": "T"}
    return asyncio.create_task(
        worker._process_job(
            job,
            _engine(),
            redis=MagicMock(),
            session_factory=_async_session_factory(),
            job_controls=reg,
            semaphore=sem,
        )
    )


async def test_paused_job_frees_its_slot_for_other_users(patched_worker, start_paused):
    reg = JobControlRegistry()
    sem = asyncio.Semaphore(1)
    await sem.acquire()  # start_worker toma el slot antes de lanzar el job
    assert sem.locked()

    task = _run("job-1", reg, sem)

    # Mientras está pausado, el slot queda disponible para otra descarga.
    assert await _wait_until(lambda: not sem.locked()), "el job pausado retuvo el slot"

    reg.get("job-1").pause_event.clear()  # reanudar
    await asyncio.wait_for(task, timeout=5)


async def test_resumed_job_takes_a_slot_again(patched_worker, start_paused):
    reg = JobControlRegistry()
    sem = asyncio.Semaphore(1)
    await sem.acquire()
    task = _run("job-1", reg, sem)
    await _wait_until(lambda: not sem.locked())

    reg.get("job-1").pause_event.clear()
    await asyncio.wait_for(task, timeout=5)

    # Al terminar debe volver a tener el slot: _run_with_semaphore libera una vez
    # al acabar el job, y ese conteo solo cuadra si aquí lo recuperó.
    assert sem.locked()


async def test_cancel_while_paused_keeps_slot_accounting_sane(patched_worker, start_paused):
    reg = JobControlRegistry()
    sem = asyncio.Semaphore(1)
    await sem.acquire()
    task = _run("job-1", reg, sem)
    await _wait_until(lambda: not sem.locked())

    reg.get("job-1").cancel_event.set()  # cancelar estando pausado
    await asyncio.wait_for(task, timeout=5)

    assert sem.locked()  # salió con el slot recuperado, sin descuadrar el conteo


async def test_running_job_keeps_its_slot(patched_worker):
    # Sin pausa el comportamiento no cambia: el job retiene su slot de principio a fin.
    reg = JobControlRegistry()
    sem = asyncio.Semaphore(1)
    await sem.acquire()

    await asyncio.wait_for(_run("job-1", reg, sem), timeout=5)

    assert sem.locked()


async def test_two_paused_jobs_do_not_exhaust_the_worker(patched_worker, start_paused):
    """El escenario del bug: con el tope global en 2, dos pausas lo agotaban."""
    reg = JobControlRegistry()
    sem = asyncio.Semaphore(2)
    tasks = []
    for job_id in ("job-1", "job-2"):
        await sem.acquire()
        tasks.append(_run(job_id, reg, sem))

    assert sem.locked()  # ambos slots tomados al arrancar

    # Con los dos pausados, un tercer usuario debe poder descargar.
    assert await _wait_until(lambda: sem._value == 2), "las pausas dejaron el worker sin slots"

    for job_id in ("job-1", "job-2"):
        reg.get(job_id).pause_event.clear()
    await asyncio.wait_for(asyncio.gather(*tasks), timeout=5)
