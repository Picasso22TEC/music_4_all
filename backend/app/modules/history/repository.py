import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.models import AuditLog, DownloadRecord


class HistoryRepository:
    async def save_download(
        self,
        session: AsyncSession,
        title: str,
        artist: str,
        quality: str,
        cover_url: str | None,
        job_id: str | None = None,
        album: str | None = None,
        user_id: str | None = None,
    ) -> DownloadRecord:
        record = DownloadRecord(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=title,
            artist=artist,
            album=album,
            quality=quality,
            cover_url=cover_url,
            job_id=job_id,
            downloaded_at=datetime.now(UTC),
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record

    async def get_all(
        self, session: AsyncSession, user_id: str, limit: int = 100
    ) -> list[DownloadRecord]:
        """Descargas de un usuario. `user_id` es obligatorio: sin filtro no hay
        historial (las filas huérfanas de la era single-user no son de nadie)."""
        result = await session.execute(
            select(DownloadRecord)
            .where(DownloadRecord.user_id == user_id)
            .order_by(DownloadRecord.downloaded_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_stats(self, session: AsyncSession, user_id: str) -> dict:
        mine = DownloadRecord.user_id == user_id

        total = await session.scalar(select(func.count(DownloadRecord.id)).where(mine)) or 0

        today = datetime.now(UTC).date()
        today_count = (
            await session.scalar(
                select(func.count(DownloadRecord.id)).where(
                    mine, func.date(DownloadRecord.downloaded_at) == today
                )
            )
        ) or 0

        quality_rows = await session.execute(
            select(DownloadRecord.quality, func.count(DownloadRecord.id))
            .where(mine)
            .group_by(DownloadRecord.quality)
            .order_by(func.count(DownloadRecord.id).desc())
        )
        by_quality = {row[0]: row[1] for row in quality_rows}

        return {"total": total, "today": today_count, "by_quality": by_quality}

    async def save_audit(
        self,
        session: AsyncSession,
        event: str,
        detail: str | None = None,
        user_id: str | None = None,
    ) -> None:
        log = AuditLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            event=event,
            detail=detail,
            created_at=datetime.now(UTC),
        )
        session.add(log)
        await session.commit()
