#!/usr/bin/env python3
"""
Script para validar que los archivos descargados sean realmente FLAC
"""
import sys
from pathlib import Path

# Añadir backend al path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from app.core.tidal import TidalDownloader
from mutagen.flac import FLAC

def check_file_format(file_path: Path) -> dict:
    """Verificar que un archivo sea realmente FLAC"""
    if not file_path.exists():
        return {"status": "error", "message": f"Archivo no existe: {file_path}"}
    
    try:
        # Verificar los bytes mágicos
        with open(file_path, 'rb') as f:
            magic = f.read(4)
        
        if magic == b'fLaC':
            # Verificar con mutagen
            audio = FLAC(str(file_path))
            return {
                "status": "valid_flac",
                "size_bytes": file_path.stat().st_size,
                "sample_rate": audio.info.sample_rate,
                "channels": audio.info.channels,
                "bit_depth": audio.info.bits_per_sample,
                "duration_seconds": audio.info.length,
                "title": audio.get('TITLE', ['Unknown'])[0],
                "message": f"FLAC válido: {audio.info.sample_rate}Hz / {audio.info.bits_per_sample}bit"
            }
        else:
            magic_hex = magic.hex()
            if magic_hex.startswith('0000001c6674797069736f6d'):
                return {"status": "mp4_container", "message": f"ARCHIVO MP4/AAC (bytes mágicos: {magic_hex[:16]})"}
            elif magic[:2] == b'\xff\xfb' or magic[:2] == b'\xff\xfa':
                return {"status": "mp3_file", "message": f"ARCHIVO MP3 (bytes mágicos: {magic_hex})"}
            else:
                return {"status": "unknown_format", "message": f"Formato desconocido (bytes mágicos: {magic_hex})"}
    
    except Exception as e:
        return {"status": "error", "message": f"Error al verificar: {str(e)}"}

def main():
    # Buscar archivos FLAC descargados
    download_dir = Path("downloads")
    if not download_dir.exists():
        print("Carpeta 'downloads' no existe")
        return
    
    flac_files = list(download_dir.rglob("*.flac"))
    
    if not flac_files:
        print("No hay archivos .flac descargados")
        return
    
    print(f"Analizando {len(flac_files)} archivo(s) FLAC...\n")
    
    valid_count = 0
    invalid_count = 0
    
    for flac_file in flac_files:
        result = check_file_format(flac_file)
        status = result.get("status", "unknown")
        
        print(f"{flac_file.name}")
        print(f"   {result.get('message', 'Sin mensaje')}")
        
        if status == "valid_flac":
            print(f"   {result['sample_rate']}Hz / {result['bit_depth']}bit / {result['channels']}ch")
            print(f"   ⏱ {result['duration_seconds']:.1f}s / {result['size_bytes'] / 1024 / 1024:.1f}MB")
            valid_count += 1
        else:
            invalid_count += 1
        
        print()
    
    print(f"\nResumen: {valid_count} válido(s), {invalid_count} inválido(s)")
    
    if invalid_count > 0:
        print("ATENCIÓN: Hay archivos que NO son FLAC válidos. Revisa la configuración de FFMPEG.")

if __name__ == "__main__":
    main()
