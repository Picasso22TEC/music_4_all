from fastapi import Depends, Request

from app.core.exceptions import ApiException
from app.core.tidal import TidalDownloader


def get_engine(request: Request) -> TidalDownloader:
    """Devuelve la instancia compartida del motor Tidal sin verificar auth."""
    return request.app.state.engine


def get_authenticated_engine(engine: TidalDownloader = Depends(get_engine)) -> TidalDownloader:
    """Devuelve el motor Tidal. Produce {"error": {"code": "UNAUTHORIZED"}} si no autenticado.

    D-09: reemplaza HTTPException(401) por ApiException para formato uniforme de errores.
    """
    if not engine.check_auth():
        raise ApiException(
            code="UNAUTHORIZED",
            message="No autenticado con Tidal. Inicia sesión primero.",
            http_status=401,
            retriable=False,
        )
    return engine
