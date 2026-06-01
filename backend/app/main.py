import asyncio
import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import ConsoleSpanExporter, SimpleSpanProcessor
from prometheus_fastapi_instrumentator import Instrumentator

from app.config import settings
from app.core import redis_client as rc
from app.core.database import AsyncSessionLocal, engine
from app.core.logging_config import get_logger, setup_logging
from app.core.models import Base
from app.core.tidal import TidalDownloader
from app.core.worker import start_worker
from app.modules.auth.router import router as auth_router
from app.modules.download.router import router as download_router
from app.modules.download.ws import router as ws_router
from app.modules.history.router import router as history_router
from app.modules.metadata.router import router as metadata_router

setup_logging(level="DEBUG" if settings.debug else "INFO")
logger = get_logger(__name__)


def _setup_tracing() -> None:
    provider = TracerProvider()
    # Console exporter para desarrollo — reemplazar por OTLP en producción
    provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))
    trace.set_tracer_provider(provider)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Music 4 All API", extra={"version": "6.0.0"})

    # ── Base de datos ──────────────────────────────────────
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # ── Redis ──────────────────────────────────────────────
    app.state.redis = await rc.create_client(settings.redis_url)

    # ── Sesión Tidal ───────────────────────────────────────
    session_data = await rc.load_session(app.state.redis)
    if not session_data:
        session_file = Path(settings.session_file)
        if session_file.exists():
            try:
                session_data = json.loads(session_file.read_text())
                await rc.save_session(app.state.redis, session_data)
                session_file.unlink(missing_ok=True)
            except Exception:
                pass

    # ── Motor Tidal ────────────────────────────────────────
    app.state.engine = TidalDownloader(session_data=session_data)
    app.state.pending_oauth = None

    # ── Worker de descargas ────────────────────────────────
    worker_task = asyncio.create_task(
        start_worker(app.state.engine, app.state.redis, AsyncSessionLocal)
    )
    logger.info("Download worker started")

    yield

    # ── Cleanup ────────────────────────────────────────────
    logger.info("Shutting down Music 4 All API")
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass

    await app.state.redis.aclose()
    await engine.dispose()
    app.state.engine._cleanup_temp_dir()


app = FastAPI(
    title="Music 4 All API",
    description="API para descargar música de Tidal",
    version="6.0.0",
    lifespan=lifespan,
)

# ── Middleware ─────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Prometheus: métricas HTTP automáticas en /metrics ─────────────────────────
Instrumentator(
    should_group_status_codes=True,
    excluded_handlers=["/metrics", "/health"],
).instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)

# ── OpenTelemetry: trazas distribuidas ────────────────────────────────────────
_setup_tracing()
FastAPIInstrumentor.instrument_app(app)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(download_router)
app.include_router(ws_router)
app.include_router(metadata_router)
app.include_router(history_router)


@app.get("/health", include_in_schema=False)
async def health_check():
    return {"status": "healthy", "service": "Music 4 All API", "version": "6.0.0"}
