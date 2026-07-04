# Flujo FLAC

Descarga y conversión garantizada a FLAC sin pérdida. Este documento consolida
el fix, la validación y las referencias (antes había varias notas sueltas del
proceso de corrección; el fix ya está cerrado y cubierto por tests).

## Qué se corrigió

**Síntoma**: archivos con extensión `.flac` pero contenido real **MP4/AAC** (el
comando de conversión no forzaba contenedor ni códec de salida).

**Fix** (`backend/app/core/tidal.py`): forzar formato y códec, y máxima compresión:

```diff
- cmd = [ffmpeg, '-y', '-i', raw_file, '-compression_level', '5', output_flac]
+ cmd = [ffmpeg, '-y', '-i', raw_file, '-f', 'flac', '-acodec', 'flac',
+        '-compression_level', '8', output_flac]
```

## Cómo validar

**Bytes mágicos** — un FLAC válido empieza por `fLaC`:

| Formato | ASCII | Hex |
|---|---|---|
| FLAC (correcto) | `fLaC` | `66 4C 61 43` |
| MP4/AAC (incorrecto) | `....ftyp` | `00 00 00 1C 66 74 79 70` |

Comprobación rápida en PowerShell:

```powershell
$bytes = [System.IO.File]::ReadAllBytes("ruta\archivo.flac")[0..3]
($bytes | ForEach-Object { '{0:x2}' -f $_ }) -join ''   # 664c6143 => FLAC valido
```

Reporte completo (formato, sample rate, bit depth, metadatos):

```bash
python tools/validation/test_flac_conversion.py
```

Si el backend corre en Docker, verificar ffmpeg: `docker compose exec backend ffmpeg -version`.

## Garantía por tests

La conversión está cubierta por `backend/tests/validation/test_flac_validation.py`
(se saltan con `skipif` si `ffmpeg`/`ffprobe` no están en el PATH). Esos tests son
la fuente de verdad del comportamiento; este documento es solo la guía operativa.
