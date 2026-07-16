from sqlalchemy.ext.asyncio import AsyncSession

from .repository import HistoryRepository
from .schemas import DownloadRecordSchema, HistoryStats


class HistoryService:
    def __init__(self) -> None:
        self.repository = HistoryRepository()

    async def get_history(
        self, session: AsyncSession, user_id: str, limit: int = 100
    ) -> list[DownloadRecordSchema]:
        records = await self.repository.get_all(session, user_id, limit)
        return [DownloadRecordSchema.model_validate(r) for r in records]

    async def get_stats(self, session: AsyncSession, user_id: str) -> HistoryStats:
        data = await self.repository.get_stats(session, user_id)
        return HistoryStats(**data)
