import asyncio
import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import ConsoleSpanExporter, SimpleSpanProcessor
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.core import redis_client as rc
from app.core.database import AsyncSessionLocal, engine
from app.core.logging_config import get_logger, setup_logging
from app.core.models import Base
from app.core.rate_limiter import limiter
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
    provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))
    trace.set_tracer_provider(provider)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Music 4 All API", extra={"version": "7.0.0"})

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    app.state.redis = await rc.create_client(settings.redis_url)

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

    app.state.engine = TidalDownloader(session_data=session_data)
    app.state.pending_oauth = None

    worker_task = asyncio.create_task(
        start_worker(app.state.engine, app.state.redis, AsyncSessionLocal)
    )

    yield

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
    version="7.0.0",
    lifespan=lifespan,
    # Deshabilitar docs en producción
    docs_url="/docs" if True else None,
    redoc_url=None,
)

# ── Rate limiting ──────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ── Compresión de respuestas ───────────────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ── CORS estricto ─────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

# ── Prometheus ────────────────────────────────────────────────────────────────
Instrumentator(
    should_group_status_codes=True,
    excluded_handlers=["/metrics", "/health"],
).instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)

# ── OpenTelemetry ─────────────────────────────────────────────────────────────
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
    return {"status": "healthy", "service": "Music 4 All API", "version": "7.0.0"}
