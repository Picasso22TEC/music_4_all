import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.tidal import TidalDownloader
from app.modules.auth.router import router as auth_router
from app.modules.download.router import router as download_router
from app.modules.download.ws import router as ws_router
from app.modules.metadata.router import router as metadata_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    session_data = None
    session_file = Path(settings.session_file)
    if session_file.exists():
        try:
            session_data = json.loads(session_file.read_text())
        except Exception:
            pass

    app.state.engine = TidalDownloader(session_data=session_data)
    app.state.download_jobs: dict = {}
    app.state.pending_oauth = None
    yield
    app.state.engine._cleanup_temp_dir()


app = FastAPI(
    title="Music 4 All API",
    description="API para descargar música de Tidal",
    version="1.0.0",
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
    return {"status": "healthy", "service": "Music 4 All API", "version": "1.0.0"}


@app.get("/history")
async def get_history():
    # Placeholder hasta Fase 3 (PostgreSQL)
    return []
