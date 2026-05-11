# Fixtures

Datos y respuestas de prueba reutilizables.

## Uso

Importa desde `conftest.py`:

```python
from tests.fixtures.conftest import tidal_session_mock, api_client

def test_algo(tidal_session_mock, api_client):
    ...
```

## Disponibles

- `tidal_session_mock`: Sesión simulada de Tidal
- `api_client`: Cliente de prueba para FastAPI
- `sample_track`: Track de prueba
- `sample_album`: Album de prueba
- `sample_metadata`: Metadata simulada
- `sample_download_job`: Job de descarga simulado
