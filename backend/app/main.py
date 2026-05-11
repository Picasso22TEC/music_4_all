"""Punto de entrada FastAPI para Music 4 All Backend."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.modules.auth.router import router as auth_router
from app.modules.download.router import router as download_router
from app.modules.download.ws import router as download_ws_router
from app.modules.metadata.router import router as metadata_router
from app.core.tidal import TidalDownloader


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.engine = TidalDownloader(session_data={"access_token": "dev-token"})
    yield

app = FastAPI(
    title="Music 4 All API",
    description="API para descargar música de Tidal",
    version="1.0.0",
    lifespan=lifespan,
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers por módulo
app.include_router(auth_router)
app.include_router(download_router)
app.include_router(download_ws_router)
app.include_router(metadata_router)


@app.get("/")
async def root():
    return {
        "message": "Welcome to Music 4 All API",
        "version": "1.0.0",
        "status": "operational",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Music 4 All API",
        "version": "1.0.0",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
