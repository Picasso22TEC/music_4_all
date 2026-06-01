from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Music 4 All"
    debug: bool = False

    # Tidal
    tidal_quality: str = "LOSSLESS"

    # Auth
    session_file: str = "session.json"

    # CORS — en producción pasar CORS_ORIGINS="http://mydomain.com" via env var
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://frontend:3000",
    ]

    class Config:
        env_file = ".env"


settings = Settings()
