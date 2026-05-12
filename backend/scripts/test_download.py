import time
import sys
from pathlib import Path

# Agregar el directorio padre (backend) al path para importaciones
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.tidal import TidalDownloader
from app.services.download_manager import DownloadManager
import json

def test_download():
    # Cargar sesión
    try:
        with open("session.json", "r") as f:
            session_data = json.load(f)
        engine = TidalDownloader(session_data=session_data)
        if not engine.check_auth():
            print("❌ No autenticado.")
            return
    except FileNotFoundError:
        print("❌ No se encontró session.json. Ejecuta primero el script de login.")
        return

    manager = DownloadManager(engine)

    # Track de prueba - USA DE EJEMPLO
    link = "https://tidal.com/track/490883015/u"
    print(f"\n📥 Obteniendo metadatos de: {link}")
    meta = engine.get_metadata(link)
    if "error" in meta:
        print(f"❌ Error metadatos: {meta['error']}")
        return

    track = meta["items"][0]
    
    print(f"\n🎵 Metadatos extraídos:")
    print(f"   Título: {track['title']}")
    print(f"   Artista: {track['artist_name']}")
    print(f"   Álbum: {track['album_name']}")
    print(f"   Duración: {track['duration']}s")
    
    folder = meta["folder"]

    print(f"\n📁 Carpeta: {folder}")
    print(f"📊 Calidad: {meta.get('quality_desc', 'HIFI')}")
    print(f"🎖️  Badge: {meta.get('quality_badge', 'HIFI')}")
    
    # Obtener el objeto tidalapi.Track real para la descarga
    track_id = meta["items"][0]["id"]
    track_obj = engine.session.track(track_id)
    
    job_id = manager.create_job(track_obj, folder)
    print(f"🔷 Job ID: {job_id}")

    prev_progress = -1
    prev_status = None
    
    print("\n⏳ Monitoreando progreso...")
    while True:
        job = manager.get_job(job_id)
        if not job:
            print("❌ Job desapareció")
            break
        
        # Mostrar cambios de progreso o estado
        progress = job.progress * 100
        if progress != prev_progress or job.status != prev_status:
            print(f"   Estado: {job.status:12} | Progreso: {progress:6.1f}% | Error: {job.error_message or 'N/A'}")
            prev_progress = progress
            prev_status = job.status
        
        if job.status in ("done", "error", "cancelled"):
            break
        time.sleep(0.3)

    print("\n" + "="*60)
    if job.status == "done":
        print(f"✅ Descarga completada exitosamente")
        print(f"   Ruta: {job.result_path}")
    elif job.status == "error":
        print(f"❌ Error en la descarga")
        print(f"   Mensaje: {job.error_message}")
    else:
        print(f"⚠️ Estado final: {job.status}")
    print("="*60 + "\n")

if __name__ == "__main__":
    test_download()