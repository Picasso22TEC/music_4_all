import time
from collections import deque
from pathlib import Path
from threading import Condition, Event, Thread
from uuid import uuid4

from app.core.tidal import TidalDownloader


class DownloadJob:
    def __init__(self, track, folder_name: str, engine: TidalDownloader):
        self.job_id = str(uuid4())
        self.track = track
        self.folder_name = folder_name
        self.engine = engine
        # Soportar tanto diccionarios como objetos
        if isinstance(track, dict):
            self.title = track.get("title", track.get("name", "Desconocido"))
        else:
            self.title = getattr(track, "name", getattr(track, "title", "Desconocido"))
        self.progress = 0.0
        self.status = "queued"  # queued, downloading, done, error, cancelled
        self.queue_position: int | None = None
        self.result_path: Path | None = None
        self.quality_text = ""
        self.sample_rate: int | None = None
        self.bit_depth: int | None = None
        self.error_message = ""
        self.cancel_event = Event()
        self.started_at: float | None = None
        self.finished_at: float | None = None
        self.updated_at: float = time.time()
        self.eta_seconds: float | None = None
        self._lock = Event()

    def _set_status(self, status: str):
        self.status = status
        self.updated_at = time.time()

    def _update_progress(self, progress: float):
        self.progress = max(0.0, min(1.0, progress))
        self.updated_at = time.time()
        if self.started_at is None or self.progress <= 0.0:
            self.eta_seconds = None
            return

        if self.progress >= 1.0:
            self.eta_seconds = 0.0
            return

        elapsed = max(time.time() - self.started_at, 0.0)
        remaining = elapsed * (1.0 - self.progress) / max(self.progress, 0.01)
        self.eta_seconds = max(0.0, remaining)

    def run(self):
        self.started_at = time.time()
        self._set_status("downloading")
        try:
            print(f"🔵 [Job {self.job_id}] Iniciando descarga de: {self.title}")
            ok, path_str, q_txt, rate, bits = self.engine.download_single_track(
                self.track,
                folder_name=self.folder_name,
                progress_callback=self._update_progress,
                cancel_event=self.cancel_event,
            )
            if ok:
                self._set_status("done")
                self.progress = 1.0
                self.eta_seconds = 0.0
                self.result_path = Path(path_str)
                self.quality_text = q_txt
                self.sample_rate = rate
                self.bit_depth = bits
                print(f"✅ [Job {self.job_id}] Descarga completada: {q_txt}")
            else:
                self._set_status("error")
                self.error_message = path_str or "Error desconocido (sin mensaje)"
                print(f"❌ [Job {self.job_id}] Error en descarga: {self.error_message}")
        except Exception as e:
            self._set_status("error")
            self.error_message = str(e) or f"Excepción sin mensaje: {type(e).__name__}"
            print(f"💥 [Job {self.job_id}] Excepción: {self.error_message}")
            import traceback

            traceback.print_exc()
        finally:
            self.finished_at = time.time()

    def to_dict(self) -> dict:
        return {
            "job_id": self.job_id,
            "title": self.title,
            "status": self.status,
            "progress": self.progress,
            "queue_position": self.queue_position,
            "eta_seconds": self.eta_seconds,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "result_path": str(self.result_path) if self.result_path else None,
            "quality_text": self.quality_text,
            "sample_rate": self.sample_rate,
            "bit_depth": self.bit_depth,
            "error": self.error_message if self.status == "error" else None,
        }


class DownloadManager:
    def __init__(self, engine: TidalDownloader):
        self.engine = engine
        self.jobs: dict[str, DownloadJob] = {}
        self._queue: deque[DownloadJob] = deque()
        self._lock = Condition()
        self._worker = Thread(target=self._worker_loop, daemon=True)
        self._worker_started = False

    def _ensure_worker(self):
        if not self._worker_started:
            self._worker_started = True
            self._worker.start()

    def _reindex_queue(self):
        for index, job in enumerate(self._queue, start=1):
            job.queue_position = index

    def _worker_loop(self):
        while True:
            with self._lock:
                while not self._queue:
                    self._lock.wait()

                job = self._queue.popleft()
                self._reindex_queue()

            if job.status == "cancelled":
                continue

            job.queue_position = None
            job.run()

    def create_job(self, track, folder_name: str = "") -> str:
        job = DownloadJob(track, folder_name, self.engine)
        with self._lock:
            self.jobs[job.job_id] = job
            self._queue.append(job)
            self._reindex_queue()
            self._ensure_worker()
            self._lock.notify()
        return job.job_id

    def get_job(self, job_id: str) -> DownloadJob | None:
        return self.jobs.get(job_id)

    def get_queue_size(self) -> int:
        with self._lock:
            return len(self._queue)

    def get_snapshot(self, job_id: str) -> dict | None:
        job = self.get_job(job_id)
        if not job:
            return None

        snapshot = job.to_dict()
        snapshot["queue_size"] = self.get_queue_size()
        return snapshot

    def cancel_job(self, job_id: str):
        with self._lock:
            job = self.jobs.get(job_id)
            if not job:
                return False

            if job.status == "queued":
                job.status = "cancelled"
                job.queue_position = None
                self._queue = deque(item for item in self._queue if item.job_id != job_id)
                self._reindex_queue()
                return True

            if job.status == "downloading":
                job.cancel_event.set()
                job.status = "cancelled"
                return True

        return False
