import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/progress/{job_id}")
async def websocket_progress(websocket: WebSocket, job_id: str):
    """Transmite el progreso de un job de descarga en tiempo real."""
    await websocket.accept()
    jobs: dict = websocket.app.state.download_jobs

    try:
        while True:
            job = jobs.get(job_id)
            if job is None:
                await websocket.send_json({"error": "Job no encontrado", "job_id": job_id})
                break

            await websocket.send_json({
                "job_id": job_id,
                "title": job.get("title", ""),
                "status": job["status"],
                "progress": job["progress"],
                "error": job.get("error"),
            })

            if job["status"] in ("completed", "failed"):
                break

            await asyncio.sleep(0.5)

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
