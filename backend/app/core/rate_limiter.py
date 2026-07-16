"""
Configuración central del rate limiter (slowapi).

La clave del límite se elige en cascada (`user_or_ip_key`): usuario > sesión > IP.
Keyear por IP era la única opción con sesión única, pero castiga a usuarios que
comparten NAT y no acota a quien rota de IP.

**Almacenamiento en memoria del proceso** (`storage_uri=None` → `MemoryStorage`).
Un comentario anterior afirmaba que main.py lo apuntaba a REDIS_URL: nunca lo ha
hecho. Consecuencias reales: los contadores se reinician al reiniciar el backend y
no se comparten entre réplicas. Con una sola réplica (decisión vigente del plan) es
aceptable; pasarlo a Redis es parte de Fase 7 (multi-réplica, AR-02), y hay que
hacerlo con cuidado porque el storage se construye al importar el módulo y ataría
los tests y el CI a un Redis vivo.
"""

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings


def user_or_ip_key(request: Request) -> str:
    """Clave del rate limit: usuario autenticado > sid de sesión > IP.

    - `request.state.current_user` lo deja `get_current_user(_optional)` al resolver
      la cookie de sesión. FastAPI resuelve las dependencias antes de ejecutar el
      endpoint (donde actúa el decorador de slowapi), así que en las rutas con auth
      el límite es **por usuario**, aunque cambie de IP o de dispositivo.
    - Sin usuario resuelto pero con cookie (ruta sin auth, o el límite por defecto
      del middleware, que corre antes que las dependencias) se keyea por `sid`.
    - Sin cookie (anónimo: login, health) queda la IP como único identificador.
    """
    user = getattr(request.state, "current_user", None)
    if user is not None:
        return f"user:{user.tidal_user_id}"
    sid = request.cookies.get(settings.session_cookie_name)
    if sid:
        return f"sid:{sid}"
    return f"ip:{get_remote_address(request)}"


limiter = Limiter(
    key_func=user_or_ip_key,
    default_limits=["200/minute"],
    storage_uri=None,  # se configura en main.py con REDIS_URL
)
