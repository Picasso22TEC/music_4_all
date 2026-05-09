"""Gestor de descargas - maneja cola, hilos y progreso"""

from typing import Optional
from enum import Enum

class DownloadStatus(str, Enum):
    PENDING = "pending"
    DOWNLOADING = "downloading"
    COMPLETED = "completed"
    FAILED = "failed"

class DownloadManager:
    """Gestor centralizado de descargas"""
    
    def __init__(self):
        self.queue = []
        self.active_downloads = {}
    
    async def add_to_queue(self, track_id: str):
        """Añadir descarga a la cola"""
        pass
    
    async def get_progress(self, job_id: str) -> Optional[dict]:
        """Obtener progreso de descarga"""
        pass
