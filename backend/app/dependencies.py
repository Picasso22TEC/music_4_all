"""Dependencias compartidas de FastAPI."""

from fastapi import HTTPException, Request, status

from app.core.tidal import TidalDownloader


def get_engine(request: Request) -> TidalDownloader:
    """Devuelve la instancia compartida del motor Tidal."""
    engine = getattr(request.app.state, "engine", None)
    if engine is None:
        engine = TidalDownloader(session_data={"access_token": "dev-token"})
        request.app.state.engine = engine
    if not engine.check_auth():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado",
        )
    return engine


def set_engine(request: Request, engine: TidalDownloader) -> None:
    """Registra o reemplaza la instancia compartida del motor Tidal."""
    request.app.state.engine = engine
