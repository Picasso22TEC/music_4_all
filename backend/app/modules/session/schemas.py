from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class UserOut(BaseModel):
    id: str
    email: str
    country_code: str
    plan: str               # "FREE" | "HIFI" | "HIFI_PLUS"


class SessionStatusResponse(BaseModel):
    status: Literal["active", "expired"]
    user: UserOut | None = None
    expires_at: str | None = None    # ISO 8601


class DeviceAuthInitResponse(BaseModel):
    device_code: str
    user_code: str
    verification_uri: str
    verification_uri_complete: str
    expires_in: int
    interval: int


class DeviceAuthPollResponse(BaseModel):
    status: Literal["pending", "authorized", "denied", "expired"]
    user: UserOut | None = None
    expires_at: str | None = None
