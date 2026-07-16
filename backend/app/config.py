from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Music 4 All"
    debug: bool = False

    # Tidal
    tidal_quality: str = "LOSSLESS"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Sesión de app (multiusuario) — cookie m4a_sid mapeada en Redis a un usuario Tidal.
    # session_encryption_key cifra los tokens Tidal en reposo: OBLIGATORIA en producción
    # (si va vacía, en dev se usa una clave efímera y los tokens no sobreviven al reinicio).
    session_encryption_key: str = ""
    session_idle_ttl: int = 1800  # 30 min de inactividad (TTL deslizante)
    session_absolute_ttl: int = 86400  # 24 h máximo por sesión
    session_cookie_name: str = "m4a_sid"
    cookie_secure: bool = False  # True en producción (cookies solo por HTTPS)
    cookie_samesite: str = "lax"  # Lax: cookie viaja en navegaciones top-level (middleware)

    # EngineRegistry (multiusuario) — un motor Tidal por usuario, con caché LRU/TTL.
    # max_user_engines acota la memoria/temp dirs; engine_idle_ttl evicta motores
    # ociosos (sin descargas en curso) para liberar su directorio temporal.
    max_user_engines: int = 50
    engine_idle_ttl: int = 1800  # 30 min sin uso → evicción

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
