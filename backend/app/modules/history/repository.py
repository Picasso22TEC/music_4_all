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
    ) -> DownloadRecord:
        record = DownloadRecord(
            id=str(uuid.uuid4()),
            title=title,
            artist=artist,
            quality=quality,
            cover_url=cover_url,
            job_id=job_id,
            downloaded_at=datetime.now(UTC),
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record

    async def get_all(self, session: AsyncSession, limit: int = 100) -> list[DownloadRecord]:
        result = await session.execute(
            select(DownloadRecord).order_by(DownloadRecord.downloaded_at.desc()).limit(limit)
        )
        return list(result.scalars().all())

    async def get_stats(self, session: AsyncSession) -> dict:
        total = await session.scalar(select(func.count(DownloadRecord.id))) or 0

        today = datetime.now(UTC).date()
        today_count = (
            await session.scalar(
                select(func.count(DownloadRecord.id)).where(
                    func.date(DownloadRecord.downloaded_at) == today
                )
            )
        ) or 0

        quality_rows = await session.execute(
            select(DownloadRecord.quality, func.count(DownloadRecord.id))
            .group_by(DownloadRecord.quality)
            .order_by(func.count(DownloadRecord.id).desc())
        )
        by_quality = {row[0]: row[1] for row in quality_rows}

        return {"total": total, "today": today_count, "by_quality": by_quality}

    async def save_audit(
        self, session: AsyncSession, event: str, detail: str | None = None
    ) -> None:
        log = AuditLog(
            id=str(uuid.uuid4()),
            event=event,
            detail=detail,
            created_at=datetime.now(UTC),
        )
        session.add(log)
        await session.commit()
