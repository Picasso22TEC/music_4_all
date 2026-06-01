import asyncio
import json

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.tidal import TidalDownloader
from app.modules.history.repository import HistoryRepository

from .schemas import DownloadJobStatus

history_repo = HistoryRepository()


def _cover_url(track) -> str | None:
    album = getattr(track, "album", None)
    cover = getattr(album, "cover", None) if album else None
    if not cover:
        return None
    return f"https://resources.tidal.com/images/{cover.replace('-', '/')}/320x320.jpg"


class DownloadRepository:
    def prepare(self, url: str, engine: TidalDownloader):
        """Parsea la URL y obtiene los tracks (bloqueante, corre en thread)."""
        kind, item_id = engine.parse_link(url)
        if not kind or not item_id:
            raise ValueError("URL de Tidal no reconocida")

        if kind == "track":
            track = engine.session.track(item_id)
            tracks = [track]
            title = track.name
            folder = engine._sanitize_filename(f"{track.artist.name} - {track.album.name}")
        elif kind == "album":
            album = engine.session.album(item_id)
            tracks = list(album.tracks())
            year = album.release_date.year if album.release_date else ""
            title = album.name
            folder = engine._sanitize_filename(
                f"{album.artist.name} - [{year}] {album.name}"
            )
        elif kind == "playlist":
            playlist = engine.session.playlist(item_id)
            tracks = list(playlist.tracks(limit=None))
            title = playlist.name
            folder = engine._sanitize_filename(f"Playlist - {playlist.name}")
        else:
            raise ValueError(f"Tipo no soportado: {kind}")

        if not tracks:
            raise ValueError("No se encontraron tracks")

        return kind, item_id, tracks, title, folder

    async def run(
        self,
        job_id: str,
        tracks: list,
        folder: str,
        engine: TidalDownloader,
        jobs: dict,
        session_factory: async_sessionmaker[AsyncSession],
    ) -> None:
        """Descarga en background, actualiza estado y persiste historial en PostgreSQL."""
        jobs[job_id]["status"] = DownloadJobStatus.DOWNLOADING
        total = len(tracks)
        last_file_path = None

        for i, track in enumerate(tracks):
            def make_cb(idx: int):
                def cb(p: float) -> None:
                    jobs[job_id]["progress"] = round((idx + p) / total * 100, 1)
                return cb

            try:
                ok, path_or_err, quality, _, _ = await asyncio.to_thread(
                    engine.download_single_track,
                    track,
                    folder,
                    make_cb(i),
                )
                if ok:
                    jobs[job_id]["done"] += 1
                    last_file_path = path_or_err

                    artist = getattr(getattr(track, "artist", None), "name", "")
                    async with session_factory() as session:
                        await history_repo.save_download(
                            session,
                            title=track.name,
                            artist=artist,
                            quality=quality,
                            cover_url=_cover_url(track),
                            job_id=job_id,
                        )
                        await history_repo.save_audit(
                            session,
                            event="download.completed",
                            detail=json.dumps({
                                "job_id": job_id,
                                "title": track.name,
                                "quality": quality,
                            }),
                        )
                else:
                    jobs[job_id]["error"] = path_or_err
            except Exception as exc:
                jobs[job_id]["error"] = str(exc)

        if jobs[job_id]["done"] == total:
            jobs[job_id]["status"] = DownloadJobStatus.COMPLETED
            jobs[job_id]["progress"] = 100.0
            if total > 1:
                folder_path = engine.download_folder / folder
                zip_buf = await asyncio.to_thread(engine.pack_folder_to_zip, folder_path)
                if zip_buf:
                    zip_path = engine.download_folder / f"{folder}.zip"
                    zip_path.write_bytes(zip_buf.read())
                    jobs[job_id]["file_path"] = str(zip_path)
            else:
                jobs[job_id]["file_path"] = last_file_path
        else:
            jobs[job_id]["status"] = DownloadJobStatus.FAILED
