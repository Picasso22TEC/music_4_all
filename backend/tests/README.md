# Tests - Guía Completa

## Estructura

```
backend/tests/
├── fixtures/
│   ├── conftest.py          # Fixtures reutilizables (mocks, clientes, datos)
│   └── README.md
├── validation/
│   ├── test_flac_validation.py  # Tests de validación FLAC
│   └── README.md
├── integration/
│   ├── test_download_flow.py    # Tests de flujo completo
│   ├── test_api_endpoints.py    # Tests de endpoints HTTP
│   └── README.md
├── test_main.py             # Punto de entrada general
└── README.md
```

## Ejecutar tests

### Todos los tests
```bash
cd backend
pytest tests/ -v
```

### Solo validación FLAC
```bash
pytest tests/validation/ -v
```

### Solo integración
```bash
pytest tests/integration/ -v
```

### Test específico
```bash
pytest tests/integration/test_download_flow.py::TestDownloadFlow::test_metadata_retrieval -v
```

### Con salida detallada en caso de fallo
```bash
pytest tests/ -vv --tb=long
```

### Con cobertura
```bash
pytest tests/ --cov=app --cov-report=html
```

## Fixtures disponibles

En cualquier test, importa y usa:

```python
def test_algo(api_client, tidal_session_mock, sample_metadata):
    # api_client: Cliente HTTP para FastAPI
    # tidal_session_mock: Sesión Tidal simulada
    # sample_metadata: Metadata de prueba
    ...
```

## Convenciones

- **Validation tests**: Verifican formato, estructura, validez de salida
- **Integration tests**: Prueban flujos completos (login → metadata → descarga)
- **Fixtures**: Datos reutilizables para evitar repetición

## Próximos pasos

- Agregar más tests de validación para otros formatos (MP4, etc)
- Tests de WebSocket para seguimiento en tiempo real
- Tests de autenticación OAuth con Tidal
- Performance tests para validar velocidad de descarga
