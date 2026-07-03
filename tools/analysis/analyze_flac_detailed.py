#!/usr/bin/env python3
"""
Análisis detallado de archivos FLAC descargados
Verifica: estructura, bitrate, frames, compresión, artefactos
"""
import sys
from pathlib import Path
sys.path.insert(0, "backend")

from mutagen.flac import FLAC
import struct

def analyze_flac_detailed(file_path: Path):
    """Análisis profundo del archivo FLAC"""
    print(f"\n{'='*70}")
    print(f"ANÁLISIS DETALLADO: {file_path.name}")
    print(f"{'='*70}\n")
    
    try:
        audio = FLAC(str(file_path))
        info = audio.info
        
        print("📊 INFORMACIÓN BÁSICA:")
        print(f"  Sample Rate: {info.sample_rate} Hz")
        print(f"  Channels: {info.channels}")
        print(f"  Bit Depth: {info.bits_per_sample} bits")
        print(f"  Duration: {info.length:.2f} segundos ({info.length/60:.2f} min)")
        print(f"  Total Samples: {info.total_samples}")
        
        print(f"\n🔧 CONFIGURACIÓN FLAC:")
        print(f"  Compression Level: {info.compression}")
        print(f"  Blocksize Min: {info.min_blocksize}")
        print(f"  Blocksize Max: {info.max_blocksize}")
        print(f"  Framesize Min: {info.min_framesize}")
        print(f"  Framesize Max: {info.max_framesize}")
        
        print(f"\n📈 BITRATE CALCULADO:")
        file_size = file_path.stat().st_size
        duration_seconds = info.length
        if duration_seconds > 0:
            bitrate_mbps = (file_size * 8) / (duration_seconds * 1_000_000)
            print(f"  Tamaño archivo: {file_size / 1_024 / 1_024:.2f} MB")
            print(f"  Bitrate promedio: {bitrate_mbps:.2f} Mbps")
            
            # Calcular bitrate teórico para FLAC lossless sin compresión
            theoretical_bitrate = (info.sample_rate * info.channels * info.bits_per_sample) / 1_000_000
            print(f"  Bitrate teórico (sin compresión): {theoretical_bitrate:.2f} Mbps")
            
            if bitrate_mbps > theoretical_bitrate * 0.95:
                print(f"  ⚠️  ADVERTENCIA: Bitrate muy alto comparado a teórico")
                print(f"      Puede indicar baja compresión o mala calidad de source")
            else:
                compression_ratio = (1 - bitrate_mbps / theoretical_bitrate) * 100
                print(f"  ✅ Compresión: {compression_ratio:.1f}%")
        
        print(f"\n🏷️ METADATOS:")
        if audio.get('TITLE'):
            print(f"  Título: {audio.get('TITLE')[0]}")
        if audio.get('ARTIST'):
            print(f"  Artista: {audio.get('ARTIST')[0]}")
        if audio.get('ALBUM'):
            print(f"  Álbum: {audio.get('ALBUM')[0]}")
        if audio.get('COMMENT'):
            print(f"  Comentario: {audio.get('COMMENT')[0]}")
        
        # Análisis de bytes de inicio para detectar compresión
        print(f"\n🔍 ANÁLISIS DE ESTRUCTURA:")
        with open(file_path, 'rb') as f:
            f.seek(4)  # Saltar "fLaC"
            # Leer primer frame header
            frame_header = f.read(2)
            if frame_header[:1] == b'\xff':
                print(f"  ✅ Primer frame válido (0xFF sync)")
            else:
                print(f"  ❌ Primer frame inválido")
        
        # Verificar si hay multiple streams (indicaría problemas)
        file_size = file_path.stat().st_size
        print(f"\n💾 ANÁLISIS DE ARCHIVO:")
        print(f"  Tamaño total: {file_size:,} bytes")
        print(f"  Bytes por segundo: {file_size / duration_seconds:,.0f}")
        
        # Si es demasiado pequeño o demasiado grande, hay problema
        if file_size < 100_000:  # Menos de 100KB
            print(f"  ⚠️  ADVERTENCIA: Archivo muy pequeño (posible descarga incompleta)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error analizando archivo: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    download_dir = Path("downloads")
    
    # Encontrar archivos FLAC
    flac_files = list(download_dir.rglob("*.flac"))
    
    if not flac_files:
        print("❌ No hay archivos FLAC")
        return
    
    print(f"\n🔎 Encontrados {len(flac_files)} archivo(s) FLAC\n")
    
    for flac_file in sorted(flac_files):
        analyze_flac_detailed(flac_file)

if __name__ == "__main__":
    main()
