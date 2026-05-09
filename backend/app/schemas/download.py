"""Esquemas para estado y progreso de descargas"""

from pydantic import BaseModel
from enum import Enum

class DownloadJobStatus(str, Enum):
    PENDING = "pending"
    DOWNLOADING = "downloading"
    COMPLETED = "completed"
    FAILED = "failed"

class DownloadJob(BaseModel):
    job_id: str
    track_id: str
    status: DownloadJobStatus
    progress: float = 0.0
    total_size: int = 0
    downloaded_size: int = 0
