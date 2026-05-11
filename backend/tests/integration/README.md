# Integration tests

Pruebas de flujo completo API + descarga.

## Propósito

Validar que el flujo completo de descargar música funcione correctamente:
1. Autenticación con Tidal
2. Obtención de metadatos
3. Inicio de descarga
4. Progreso en tiempo real
5. Completitud del archivo

## Ejemplo

```bash
pytest backend/tests/integration/ -v --tb=short
```

## Tests disponibles

- `test_download_flow.py`: Flujo completo de descarga
- `test_api_endpoints.py`: Tests de endpoints HTTP
