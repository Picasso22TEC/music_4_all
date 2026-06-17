from datetime import datetime

from pydantic import BaseModel


class DownloadRecordSchema(BaseModel):
    id: str
    title: str
    artist: str
    quality: str
    cover_url: str | None = None
    job_id: str | None = None
    downloaded_at: datetime

    model_config = {"from_attributes": True}


class HistoryStats(BaseModel):
    total: int
    today: int
    by_quality: dict[str, int]
