# Validation tests

Pruebas enfocadas en validacion de salida y formato.

## Propósito

Validar que los archivos descargados cumplan con los requisitos:
- Formato FLAC correcto (bytes mágicos válidos)
- Metadatos presentes y correctos
- Bitrate dentro del rango esperado
- Sin errores de corrupción

## Ejemplo

```bash
pytest backend/tests/validation/ -v
```

## Tests disponibles

- `test_flac_validation.py`: Validación de formato FLAC
