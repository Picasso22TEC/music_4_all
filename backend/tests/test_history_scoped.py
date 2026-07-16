"""El historial es por usuario: nadie ve descargas de otro (ni las huérfanas).

Se ejercita contra SQLite en memoria con el esquema real de `app.core.models`.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.models import Base
from app.modules.history.repository import HistoryRepository
from app.modules.history.service import HistoryService

_repo = HistoryRepository()


@pytest.fixture
async def session():
    # StaticPool + una sola conexión: ":memory:" es por conexión, y sin esto cada
    # checkout vería una base vacía.
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as s:
        yield s
    await engine.dispose()


async def _save(session, user_id: str | None, title: str, quality: str = "FLAC") -> None:
    await _repo.save_download(
        session,
        title=title,
        artist="A",
        quality=quality,
        cover_url=None,
        job_id="job-1",
        user_id=user_id,
    )


# ── Lectura scoped ────────────────────────────────────────────────────────────
async def test_user_only_sees_own_downloads(session):
    await _save(session, "alice", "Alice Track")
    await _save(session, "bob", "Bob Track")

    titles = [r.title for r in await _repo.get_all(session, "alice")]
    assert titles == ["Alice Track"]


async def test_orphan_rows_are_invisible(session):
    # Filas previas al multiusuario (sin dueño): se conservan, no se muestran.
    await _save(session, None, "Legacy Track")
    await _save(session, "alice", "Alice Track")

    titles = [r.title for r in await _repo.get_all(session, "alice")]
    assert titles == ["Alice Track"]


async def test_empty_history_for_user_without_downloads(session):
    await _save(session, "alice", "Alice Track")
    assert await _repo.get_all(session, "carol") == []


async def test_limit_is_respected(session):
    for i in range(5):
        await _save(session, "alice", f"T{i}")
    assert len(await _repo.get_all(session, "alice", limit=2)) == 2


# ── Estadísticas scoped ───────────────────────────────────────────────────────
async def test_stats_count_only_own_downloads(session):
    await _save(session, "alice", "A1", quality="FLAC")
    await _save(session, "alice", "A2", quality="AAC")
    await _save(session, "bob", "B1", quality="FLAC")
    await _save(session, None, "Legacy", quality="FLAC")

    stats = await _repo.get_stats(session, "alice")
    assert stats["total"] == 2
    assert stats["by_quality"] == {"FLAC": 1, "AAC": 1}


async def test_stats_are_zero_for_user_without_downloads(session):
    await _save(session, "alice", "A1")
    stats = await _repo.get_stats(session, "carol")
    assert stats == {"total": 0, "today": 0, "by_quality": {}}


async def test_stats_today_counts_todays_downloads(session):
    await _save(session, "alice", "A1")
    stats = await _repo.get_stats(session, "alice")
    assert stats["today"] == 1


# ── Auditoría ─────────────────────────────────────────────────────────────────
async def test_audit_records_the_user(session):
    from sqlalchemy import select

    from app.core.models import AuditLog

    await _repo.save_audit(session, event="download.completed", detail="{}", user_id="alice")
    log = (await session.execute(select(AuditLog))).scalars().one()
    assert log.user_id == "alice"


# ── Servicio ──────────────────────────────────────────────────────────────────
async def test_service_passes_the_user_through(session):
    await _save(session, "alice", "Alice Track")
    await _save(session, "bob", "Bob Track")

    records = await HistoryService().get_history(session, "bob")
    assert [r.title for r in records] == ["Bob Track"]
