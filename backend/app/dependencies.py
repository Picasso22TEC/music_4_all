from fastapi import Depends, HTTPException, Request, status

from app.core.tidal import TidalDownloader


def get_engine(request: Request) -> TidalDownloader:
    """Devuelve la instancia compartida del motor Tidal sin verificar auth."""
    return request.app.state.engine


def get_authenticated_engine(engine: TidalDownloader = Depends(get_engine)) -> TidalDownloader:
    """Devuelve el motor Tidal solo si está autenticado con Tidal."""
    if not engine.check_auth():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado con Tidal. Inicia sesión primero.",
        )
    return engine
