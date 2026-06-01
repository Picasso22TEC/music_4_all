from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

from .schemas import DownloadRecordSchema, HistoryStats
from .service import HistoryService

router = APIRouter(prefix="/history", tags=["history"])
service = HistoryService()


@router.get("", response_model=list[DownloadRecordSchema])
async def get_history(
    limit: int = Query(100, ge=1, le=500),
    session: AsyncSession = Depends(get_db),
):
    """Devuelve el historial de descargas desde PostgreSQL."""
    return await service.get_history(session, limit)


@router.get("/stats", response_model=HistoryStats)
async def get_stats(session: AsyncSession = Depends(get_db)):
    """Métricas agregadas: total, hoy, distribución por calidad."""
    return await service.get_stats(session)
