"""Configuración y variables de entorno"""

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Configuración de la aplicación"""
    app_name: str = "Music 4 All"
    debug: bool = False
    api_v1_str: str = "/api/v1"
    
    # Tidal
    tidal_quality: str = "LOSSLESS"
    
    class Config:
        env_file = ".env"

settings = Settings()
