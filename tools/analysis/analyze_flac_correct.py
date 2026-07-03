#!/usr/bin/env python3
"""Análisis de FLAC - versión con ruta completa"""

import struct
import sys
from pathlib import Path

def read_flac_info(file_path):
    """Leer información FLAC sin mutagen"""
    
    try:
        with open(file_path, 'rb') as f:
            # Verificar header
            magic = f.read(4)
            if magic != b'fLaC':
                return {"error": f"No es FLAC válido. Magic: {magic.hex()}"}
            
            # Leer STREAMINFO (primer metadata block)
            header_byte = f.read(1)
            if not header_byte:
                return {"error": "No hay metadata"}
            
            is_last = (header_byte[0] & 0x80) != 0
            meta_type = header_byte[0] & 0x7F
            
            if meta_type != 0:
                return {"error": f"Primer block no es STREAMINFO (type: {meta_type})"}
            
            # Leer tamaño del metadata block
            size_bytes = f.read(3)
            meta_size = (size_bytes[0] << 16) | (size_bytes[1] << 8) | size_bytes[2]
            
            # Leer STREAMINFO (34 bytes)
            streaminfo = f.read(min(meta_size, 34))
            
            if len(streaminfo) < 34:
                return {"error": "STREAMINFO incompleto"}
            
            # Parsear STREAMINFO
            min_block = struct.unpack('>H', streaminfo[0:2])[0]
            max_block = struct.unpack('>H', streaminfo[2:4])[0]
            min_frame = struct.unpack('>I', b'\x00' + streaminfo[4:7])[0]
            max_frame = struct.unpack('>I', b'\x00' + streaminfo[7:10])[0]
            
            # Sample rate (20 bits), channels (3 bits), bit depth (5 bits)
            sr_channels_bps = struct.unpack('>I', streaminfo[10:14])[0]
            sample_rate = sr_channels_bps >> 12
            channels = ((sr_channels_bps >> 9) & 0x07) + 1
            bits_per_sample = ((sr_channels_bps >> 4) & 0x1F) + 1
            
            # Total samples (36 bits)
            total_samples_bps = struct.unpack('>Q', streaminfo[14:22])[0]
            total_samples = total_samples_bps >> 28
            
            # MD5 signature (16 bytes)
            md5_sig = streaminfo[18:34].hex()
            
            # Cálculos
            duration = total_samples / sample_rate if sample_rate > 0 else 0
            file_size = file_path.stat().st_size
            
            # Bitrate en Mbps
            bitrate_bps = (file_size * 8) / duration if duration > 0 else 0  # bits/s
            bitrate_mbps = bitrate_bps / 1_000_000
            bitrate_theoretical = (sample_rate * channels * bits_per_sample) / 1_000_000
            compression = (1 - bitrate_mbps / bitrate_theoretical) * 100 if bitrate_theoretical > 0 else 0
            
            return {
                "sample_rate": sample_rate,
                "channels": channels,
                "bits_per_sample": bits_per_sample,
                "total_samples": total_samples,
                "duration_seconds": duration,
                "duration_readable": f"{int(duration//60)}:{int(duration%60):02d}",
                "file_size_bytes": file_size,
                "file_size_mb": file_size / (1024 * 1024),
                "bitrate_actual_mbps": bitrate_mbps,
                "bitrate_theoretical_mbps": bitrate_theoretical,
                "bitrate_actual_kbps": bitrate_mbps * 1000,
                "compression_percent": compression,
                "md5": md5_sig,
                "min_block_size": min_block,
                "max_block_size": max_block
            }
    
    except Exception as e:
        return {"error": str(e), "exception": repr(e)}

def main():
    # Buscar archivos FLAC
    base_dir = Path(__file__).parent
    flac_files = list((base_dir / "downloads").rglob("*.flac"))
    
    if not flac_files:
        print(f"❌ No hay archivos FLAC en: {base_dir / 'downloads'}")
        return
    
    for file_path in flac_files:
        print(f"\nAnalizando: {file_path.name}\n")
        
        info = read_flac_info(file_path)
        
        if "error" in info:
            print(f"❌ Error: {info['error']}")
            if "exception" in info:
                print(f"   Exception: {info['exception']}")
            continue
        
        print("=" * 70)
        print("ANÁLISIS DE ARCHIVO FLAC")
        print("=" * 70)
        
        print(f"\n📊 PROPIEDADES DE AUDIO:")
        print(f"  Sample Rate: {info['sample_rate']} Hz")
        print(f"  Canales: {info['channels']}")
        print(f"  Bit Depth: {info['bits_per_sample']} bits")
        print(f"  Duración: {info['duration_readable']} ({info['duration_seconds']:.2f}s)")
        
        print(f"\n💾 TAMAÑO Y COMPRESIÓN:")
        print(f"  Tamaño archivo: {info['file_size_mb']:.2f} MB ({info['file_size_bytes']:,} bytes)")
        print(f"  Bitrate actual: {info['bitrate_actual_mbps']:.3f} Mbps ({info['bitrate_actual_kbps']:.1f} kbps)")
        print(f"  Bitrate teórico: {info['bitrate_theoretical_mbps']:.2f} Mbps (sin compresión)")
        print(f"  Compresión: {info['compression_percent']:.1f}%")
        
        print(f"\n🔍 ANÁLISIS DE CALIDAD:")
        if info['compression_percent'] >= 80:
            print(f"  ⚠️ ⚠️  COMPRESIÓN EXTREMA ({info['compression_percent']:.1f}%)")
            print(f"      POSIBLE FUENTE LOSSY (AAC/OGG/MP3) convertida a FLAC")
            print(f"      Revisa el manifiesto del stream para confirmar codec real")
        elif info['compression_percent'] >= 55:
            print(f"  ✅ Compresión alta pero plausible ({info['compression_percent']:.1f}%)")
            print(f"     Puede ser audio lossless con contenido sencillo/silencioso")
        elif info['compression_percent'] >= 25:
            print(f"  ✅ Compresión normal ({info['compression_percent']:.1f}%)")
            print(f"     Rango típico de FLAC para la mayoría de música")
        else:
            print(f"  ℹ️  Compresión baja ({info['compression_percent']:.1f}%)")
            print(f"     Puede indicar material muy ruidoso o poca compresibilidad")
        
        print(f"\n⚙️ INFORMACIÓN TÉCNICA:")
        print(f"  Total Samples: {info['total_samples']:,}")
        print(f"  Min Blocksize: {info['min_block_size']}")
        print(f"  Max Blocksize: {info['max_block_size']}")
        print(f"  MD5: {info['md5']}")
        print("\n")

if __name__ == "__main__":
    main()
