from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, model_validator

_VALID_QUALITIES = frozenset({"MASTER", "HIRES", "HIGH", "NORMAL"})


class StartDownloadRequest(BaseModel):
    album_id: str | None = None
    track_id: str | None = None
    quality: str = "MASTER"

    @model_validator(mode="after")
    def _validate(self) -> StartDownloadRequest:
        has_album = bool(self.album_id)
        has_track = bool(self.track_id)
        if has_album and has_track:
            raise ValueError("Proporcionar solo album_id o track_id, no ambos")
        if not has_album and not has_track:
            raise ValueError("Se requiere album_id o track_id")
        if self.quality not in _VALID_QUALITIES:
            raise ValueError(f"quality debe ser uno de: {', '.join(sorted(_VALID_QUALITIES))}")
        return self


class StartDownloadResponse(BaseModel):
    job_id: str
    status: str             # "queued"
    estimated_tracks: int


class UpdateJobRequest(BaseModel):
    action: Literal["pause", "resume", "retry"]


class UpdateJobResponse(BaseModel):
    job_id: str
    status: str


class CancelJobResponse(BaseModel):
    job_id: str
    cancelled: bool
    tracks_saved: int
    output_path: str | None = None
