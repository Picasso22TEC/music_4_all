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

- `test_flac_validation.py`: Validación de formato FLAC, extracción FLAC desde MP4 y descarga real (`@pytest.mark.slow`)
- `test_metadata_validation.py`: Validación de metadatos embebidos (tags, portada, letras) y descarga real (`@pytest.mark.slow`)

## Pruebas `@pytest.mark.slow`

Las pruebas marcadas como `slow` descargan contenido real desde Tidal y requieren
las variables de entorno `TIDAL_TEST_ACCESS_TOKEN` / `TIDAL_TEST_REFRESH_TOKEN`
(ver fixture `tidal_session` en `tests/conftest.py`). Sin ellas, se omiten (`SKIPPED`)
automáticamente. `TIDAL_TEST_TRACK_ID` permite configurar el track de referencia
(por defecto, un track LOSSLESS 16-bit/44.1kHz).
