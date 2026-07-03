#!/usr/bin/env python3
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from mutagen.flac import FLAC

file_path = Path("downloads/tidal_dl_mh9noz4w/System Of A Down - [2002] Steal This Album!/08. I-E-A-I-A-I-O.flac")

if not file_path.exists():
    print(f"❌ Archivo no encontrado: {file_path}")
    sys.exit(1)

try:
    audio = FLAC(str(file_path))
    info = audio.info
    
    file_size = file_path.stat().st_size
    duration = info.length
    
    # Calcular bitrates
    bitrate_actual = (file_size * 8) / (duration * 1_000_000) if duration > 0 else 0
    bitrate_teorico = (info.sample_rate * info.channels * info.bits_per_sample) / 1_000_000
    compression = (1 - bitrate_actual / bitrate_teorico) * 100 if bitrate_teorico > 0 else 0
    
    print("\n" + "="*70)
    print("ANÁLISIS DETALLADO DEL ARCHIVO FLAC")
    print("="*70)
    
    print(f"\n📊 PROPIEDADES DE AUDIO:")
    print(f"  Frecuencia: {info.sample_rate} Hz")
    print(f"  Canales: {info.channels}")
    print(f"  Profundidad: {info.bits_per_sample} bits")
    print(f"  Duración: {duration:.2f}s ({duration/60:.2f} min)")
    
    print(f"\n💾 TAMAÑO Y COMPRESIÓN:")
    print(f"  Archivo: {file_size:,} bytes ({file_size/1024/1024:.2f} MB)")
    print(f"  Bitrate actual: {bitrate_actual:.2f} Mbps")
    print(f"  Bitrate teórico: {bitrate_teorico:.2f} Mbps (sin compresión)")
    print(f"  Compresión: {compression:.1f}%")
    
    print(f"\n🔍 METADATOS:")
    print(f"  Título: {audio.get('TITLE', ['N/A'])[0]}")
    print(f"  Artista: {audio.get('ARTIST', ['N/A'])[0]}")
    print(f"  Álbum: {audio.get('ALBUM', ['N/A'])[0]}")
    print(f"  Comentario: {audio.get('COMMENT', ['N/A'])[0]}")
    
    print(f"\n⚙️ CONFIGURACIÓN FLAC:")
    print(f"  Compression Level: {info.compression}")
    print(f"  Blocksize Min: {info.min_blocksize}")
    print(f"  Blocksize Max: {info.max_blocksize}")
    
    # Análisis de calidad
    print(f"\n✨ ANÁLISIS DE CALIDAD:")
    if compression < 30:
        print(f"  ⚠️ BAJA COMPRESIÓN ({compression:.1f}%)")
        print(f"     Indicativo de: audio de baja calidad, ya comprimido, o con ruido")
    elif compression > 60:
        print(f"  ✅ COMPRESIÓN NORMAL ({compression:.1f}%)")
        print(f"     Indicativo de: audio lossless de buena calidad")
    else:
        print(f"  ℹ️ Compresión media ({compression:.1f}%)")
    
    print(f"\n")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
