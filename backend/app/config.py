from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Music 4 All"
    debug: bool = False

    # Tidal
    tidal_quality: str = "LOSSLESS"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Worker concurrency
    max_concurrent_downloads: int = 3

    # PostgreSQL — SQLite solo en desarrollo local
    database_url: str = "sqlite+aiosqlite:///./dev.db"

    @property
    def async_database_url(self) -> str:
        """Asegura el driver async correcto en la URL."""
        url = self.database_url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        return url  # sqlite+aiosqlite ya tiene el driver correcto

    # CORS — en producción pasar CORS_ORIGINS="http://mydomain.com" via env var
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://frontend:3000",
    ]

    class Config:
        env_file = ".env"


settings = Settings()
