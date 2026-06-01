from enum import Enum
from pydantic import BaseModel, field_validator


class DownloadJobStatus(str, Enum):
    PENDING = "pending"
    DOWNLOADING = "downloading"
    COMPLETED = "completed"
    FAILED = "failed"


class DownloadRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def must_be_tidal_url(cls, v: str) -> str:
        if "tidal.com" not in v:
            raise ValueError("La URL debe ser de Tidal")
        return v.strip()


class DownloadStartResponse(BaseModel):
    job_id: str
    title: str
    status: DownloadJobStatus


class DownloadStatusResponse(BaseModel):
    job_id: str
    title: str
    status: DownloadJobStatus
    progress: float
    error: str | None = None
