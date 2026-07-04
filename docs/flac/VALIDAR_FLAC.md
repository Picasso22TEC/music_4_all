# VALIDACIÓN DE DESCARGA FLAC - Guía Rápida

## Verificación Rápida de Archivos

### Opción 1: Usar PowerShell (Más rápido)
```powershell
# Ver primeros bytes de un archivo
$file = "ruta\a\archivo.flac"
[byte[]]$bytes = [System.IO.File]::ReadAllBytes($file)[0..3]
$hex = ($bytes | ForEach-Object { '{0:x2}' -f $_ }) -join ''
Write-Host "Magic bytes: $hex"

# Si es "664c6143" → ✅ FLAC válido
# Si es "0000001c6674797069..." → ❌ MP4/AAC incorrecto
```

### Opción 2: Python Script (Completo)
```bash
python test_flac_conversion.py
```
Genera reporte detallado con:
- Formato verificado (FLAC vs MP4 vs Desconocido)
- Sample rate / Bit depth / Canales
- Duración / Tamaño del archivo
- Metadatos (Título, Artista, etc)

## Qué se corrigió

### Problema: Descargas como MP4/AAC con extensión .flac

**Causa**: Comando FFMPEG no especificaba el formato de salida

```diff
- cmd = [ffmpeg, '-y', '-i', raw_file, '-compression_level', '5', output.flac]
+ cmd = [ffmpeg, '-y', '-i', raw_file, '-f', 'flac', '-acodec', 'flac', 
+        '-compression_level', '8', output.flac]
```

### Cambios clave:
- Agregado `-f flac` (especificar formato contenedor)
- Agregado `-acodec flac` (especificar codec audio)
- Aumentada compresión de 5 a 8 (máxima sin pérdida)

## Formato de Bytes Mágicos (Validación)

| Formato | Bytes Mágicos | Hex |
|---------|------|-----|
| **FLAC** | `fLaC` | `66 4C 61 43` |
| MP4 | `....ftyp` | `00 00 00 1C 66 74 79 70` |
| MP3 | `ÿû` | `FF FB` |
| AAC | `ÿá/ÿá` | `FF E1 / FF F1` |

## Próximas Descargas

1. El sistema ahora generará **FLAC válidos**
2. Ejecuta `test_flac_conversion.py` después de descargar
3. Si ves "`FLAC válido`" → Todo correcto
4. Si ves "`ARCHIVO MP4/AAC`" → Revisa FFMPEG

## Nota Importante

Si el backend está corriendo en Docker, verifica que:
- FFMPEG esté instalado: `docker-compose exec backend ffmpeg -version`
- O instálalo: `apt-get update && apt-get install -y ffmpeg`
