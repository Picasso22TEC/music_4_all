from pydantic import BaseModel


class DeviceAuthResponse(BaseModel):
    verification_uri_complete: str
    user_code: str
    expires_in: int


class AuthStatusResponse(BaseModel):
    authenticated: bool
    message: str = ""
