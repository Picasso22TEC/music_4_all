from enum import Enum

from pydantic import BaseModel, field_validator

from app.core.sanitizer import sanitize_tidal_url


class DownloadJobStatus(str, Enum):
    PENDING = "pending"
    STARTED = "started"       # pub/sub-only: signals job_started; never stored in Redis state
    DOWNLOADING = "downloading"
    COMPLETED = "completed"
    FAILED = "failed"


class DownloadRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def validate_and_sanitize_url(cls, v: str) -> str:
        return sanitize_tidal_url(v)


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
