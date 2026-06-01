import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core import redis_client as rc
from app.core.tidal import TidalDownloader
from app.modules.auth.router import router as auth_router
from app.modules.download.router import router as download_router
from app.modules.download.ws import router as ws_router
from app.modules.metadata.router import router as metadata_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Redis ──────────────────────────────────────────────
    app.state.redis = await rc.create_client(settings.redis_url)

    # ── Sesión: Redis primero, session.json como migración ─
    session_data = await rc.load_session(app.state.redis)
    if not session_data:
        session_file = Path(settings.session_file)
        if session_file.exists():
            try:
                session_data = json.loads(session_file.read_text())
                # Migrar a Redis y borrar el archivo local
                await rc.save_session(app.state.redis, session_data)
                session_file.unlink(missing_ok=True)
            except Exception:
                pass

    # ── Motor Tidal ────────────────────────────────────────
    app.state.engine = TidalDownloader(session_data=session_data)
    app.state.download_jobs: dict = {}
    app.state.pending_oauth = None

    yield

    # ── Cleanup ────────────────────────────────────────────
    await app.state.redis.aclose()
    app.state.engine._cleanup_temp_dir()


app = FastAPI(
    title="Music 4 All API",
    description="API para descargar música de Tidal",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(download_router)
app.include_router(ws_router)
app.include_router(metadata_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Music 4 All API", "version": "2.0.0"}


@app.get("/history")
async def get_history(request: Request):
    """Historial de descargas desde Redis."""
    return await rc.get_history(request.app.state.redis)
