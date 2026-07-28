"""Schemas de Web Push (PWA P1-C)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class PushPublicKeyResponse(BaseModel):
    """Estado del push + applicationServerKey para suscribirse en el navegador."""

    enabled: bool
    public_key: str | None = None


class PushSubscribeRequest(BaseModel):
    """El objeto que produce `PushSubscription.toJSON()` en el navegador."""

    endpoint: str = Field(..., min_length=1)
    keys: dict[str, str]
    expiration_time: float | None = Field(None, alias="expirationTime")

    model_config = {"populate_by_name": True}

    def to_subscription(self) -> dict:
        return {"endpoint": self.endpoint, "keys": self.keys}


class PushUnsubscribeRequest(BaseModel):
    endpoint: str = Field(..., min_length=1)


class PushSubscribeResponse(BaseModel):
    subscribed: bool
