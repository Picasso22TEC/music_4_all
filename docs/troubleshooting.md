# Troubleshooting — Music 4 All

Problemas reales encontrados durante el desarrollo, su causa raíz, la solución aplicada y pasos de diagnóstico para reproducir/verificar.

---

## 1. Docker + uv + `.venv` de Windows

**Problema**: dentro del contenedor `backend`, las llamadas HTTPS (tidalapi, etc.) fallaban y/o el entorno Python no encontraba los paquetes instalados, a pesar de que la imagen se construyó correctamente con `uv sync`.

**Causa raíz**: `docker-compose.yml` monta `./backend:/app` como bind-mount para habilitar hot-reload. Ese bind-mount **sobrescribe** el `.venv` Linux construido dentro de la imagen con el `.venv` de Windows del host (si existía en `backend/.venv`). El resultado es un entorno virtual con rutas y binarios de Windows ejecutándose dentro de un contenedor Linux — incompatible.

**Solución aplicada**:
- Se añadió un **volumen nombrado** `backend_venv:/app/.venv` en el servicio `backend` de `docker-compose.yml`. Docker monta este volumen *sobre* el bind-mount, preservando el `.venv` Linux construido en la imagen (el bind-mount no lo sobrescribe).
- Se añadió `UV_LINK_MODE=copy` como variable de entorno del servicio `backend`, porque `uv` por defecto usa hardlinks/symlinks para su caché, lo cual falla cuando el bind-mount es un filesystem cruzado (volumen de Windows montado en Linux).
- Se declaró `backend_venv` en la sección `volumes:` de nivel superior.

**Pasos de diagnóstico**:
1. `docker compose exec backend python -c "import sys; print(sys.executable)"` — debe apuntar a `/app/.venv/bin/python` (Linux), **no** a una ruta que contenga `Scripts\python.exe` o letras de unidad Windows.
2. `docker compose exec backend uv run python -c "import certifi; print(certifi.where())"` — la ruta debe existir dentro del contenedor (`/app/.venv/lib/python3.11/site-packages/certifi/cacert.pem`).
3. Si el problema reaparece tras un `docker compose down -v` + `up --build`, verificar que el volumen `backend_venv` se haya creado (`docker volume ls | grep backend_venv`) y que **no** exista un `.venv` real en `backend/` del host que se esté priorizando por alguna configuración local.
4. Nunca ejecutar `uv sync` desde Windows directamente dentro de `backend/` si se va a usar también con Docker — mantener entornos separados (host Windows vs. volumen Docker).

---

## 1.a Frontend sin estilos: `pnpm build` del host Windows pisando el `.next` del contenedor

**Problema**: la web se ve como HTML crudo (sin CSS, sin botones, tipografía por defecto). En consola, **404 en todos los assets**: `_next/static/css/app/layout.css`, `main-app.js`, `app/layout.js`, el chunk de la página. En los logs del contenedor `frontend`, `MODULE_NOT_FOUND` con `requireStack: ['/app/.next/server/webpack-runtime.js', ...]`.

**Causa raíz**: misma familia que el problema 1 (artefacto de build de Windows colándose en el contenedor Linux por el bind-mount). `docker-compose.yml` monta `./frontend:/app`, y `node_modules` estaba protegido con un volumen nombrado pero **`.next` no**. Ejecutar `pnpm build` en el host (los gates de calidad lo hacen) deja en `frontend/.next` un build de **producción** (`BUILD_ID`, `prerender-manifest.json`), que el bind-mount entrega al `next dev` del contenedor. El dev-server no reconoce ese build: sirve HTML que apunta a chunks de desarrollo que no existen → 404 en todo y la página sin estilos. Reiniciar el contenedor no lo arregla (el `.next` malo sigue en el host); parece un problema de hot-reload y no lo es.

**Solución aplicada**: volumen nombrado `frontend_next_cache:/app/.next` en el servicio `frontend` (mismo patrón que `backend_venv`). El contenedor construye su `.next` en un volumen Linux y el `.next` del host queda enmascarado, así que un `pnpm build` en Windows ya no puede romper el contenedor.

**Pasos de diagnóstico**:
1. `cat frontend/.next/BUILD_ID` en el host — si existe, hay un build de producción (solo lo crea `next build`).
2. `docker exec tidal_downloader-frontend-1 cat /app/.next/BUILD_ID` — si devuelve **el mismo id**, el contenedor está usando el build del host: ese es el fallo.
3. Con el arreglo aplicado, ese comando no debe encontrar `BUILD_ID` (un build de desarrollo no lo genera) y la consola del navegador debe quedar sin errores.

---

## 1.b Base creada por el `create_all` antiguo: `DuplicateTableError` al migrar

**Problema**: tras pasar el esquema a Alembic (Fase 3), el contenedor `backend` no arranca y el entrypoint falla con `asyncpg.exceptions.DuplicateTableError: relation "downloads" already exists`.

**Causa raíz**: hasta la Fase 3, el lifespan de `app/main.py` llamaba a `Base.metadata.create_all` y **nadie ejecutaba Alembic** (ni compose, ni el Dockerfile, ni CI). Las bases desplegadas así tienen las tablas pero **no** la tabla `alembic_version`, así que Alembic las cree vacías e intenta aplicar `001` (crear tablas) sobre tablas que ya existen. El mismo agujero explicaba un fallo peor y silencioso: `create_all` **no altera** tablas existentes, de modo que las columnas nuevas (`user_id` en la Fase 3) nunca aparecían en un despliegue ya en marcha y el error salía en tiempo de ejecución (historial a 500, `save_download` fallando en el worker).

**Solución aplicada**:
- `create_all` fuera del lifespan: el esquema lo gestiona **solo** Alembic.
- `backend/docker-entrypoint.sh` ejecuta `alembic upgrade head` antes de arrancar uvicorn (una vez por contenedor; hacerlo en el lifespan lo lanzaría una vez por worker en el target de producción, que usa `--workers 2`).
- `tests/test_migrations_match_models.py` compara el esquema de las migraciones con el de los modelos para que la deriva falle en CI y no en producción.
- Para adoptar una base preexistente, **una sola vez**, registrarla en la revisión que corresponda a su esquema (`002` si tiene `album` pero no `user_id`):
  ```bash
  docker exec tidal_downloader-backend-1 sh -c 'cd /app && uv run alembic stamp 002'
  ```

**Pasos de diagnóstico**:
1. `docker exec tidal_downloader-postgres-1 psql -U music4all -d music4all -t -c "SELECT version_num FROM alembic_version;"` — si da `relation "alembic_version" does not exist`, la base nunca pasó por Alembic.
2. Confirmar a qué revisión equivale su esquema comparando columnas e índices con las migraciones (`\d downloads`): 001 crea las tablas base, 002 añade `album`, 003 añade `user_id`.
3. Tras el `stamp`, `alembic upgrade head` debe aplicar solo lo pendiente y los datos permanecer intactos (`SELECT COUNT(*) FROM downloads;` antes y después).

---

## 2. `certifi` / `cacert.pem` no encontrado dentro del contenedor

**Problema**: peticiones HTTPS desde el backend (tidalapi, llamadas a `resources.tidal.com`, OAuth) fallaban dentro del contenedor con errores de verificación SSL / archivo de certificados no encontrado, aunque el mismo código funcionaba en el host Windows.

**Causa raíz**: es el **mismo problema #1** visto desde el síntoma SSL: al sobrescribirse el `.venv` Linux con el `.venv` de Windows (vía bind-mount sin el volumen nombrado), `certifi.where()` devolvía una ruta de Windows (p. ej. `C:\...\site-packages\certifi\cacert.pem`) que **no existe** dentro del contenedor Linux. `aiohttp`/`requests`/`tidalapi` usan esa ruta para verificar certificados TLS, por lo que **toda llamada HTTPS fallaba**.

**Solución aplicada**: la misma que en #1 — volumen nombrado `backend_venv:/app/.venv` + `UV_LINK_MODE=copy`. Al preservarse el `.venv` Linux construido en la imagen, `certifi` apunta a su propio `cacert.pem` dentro del contenedor.

**Pasos de diagnóstico**:
1. Dentro del contenedor: `docker compose exec backend uv run python -c "import certifi; print(certifi.where())"`.
2. Si la ruta impresa contiene `\\` (backslashes) o una letra de unidad (`C:`), el `.venv` montado es el de Windows → revisar que el volumen `backend_venv` esté correctamente declarado y montado *después* del bind-mount en `docker-compose.yml`.
3. Verificar que el archivo exista: `docker compose exec backend ls $(docker compose exec backend uv run python -c "import certifi; print(certifi.where())")`.
4. Si persiste, reconstruir sin caché: `docker compose build --no-cache backend` y `docker compose up -d backend`.

---

## 3. OAuth Device Flow de Tidal devuelve URLs sin esquema

**Problema**: el enlace de verificación del login (Device Authorization, `verification_uri_complete`) llevaba a los usuarios a una **página 404** en lugar de a la página de activación de Tidal.

**Causa raíz**: la API de Device Authorization de Tidal (vía `tidalapi`) devuelve `verification_uri` / `verification_uri_complete` como **hostnames sin esquema**, p. ej. `link.tidal.com/ABCDE` (sin `https://`). Cuando ese valor se usa directamente como `href` de un `<a>` o en `window.open()`, el navegador lo interpreta como una **ruta relativa** al sitio actual, no como una URL externa → 404.

**Solución aplicada** (commit `c2d886b` "Arreglar autenticacion", mergeado en `d8a9c74`):
- **Backend v2 (activo)** — `backend/app/modules/session/service.py`: función `_ensure_https(url)` que:
  - Si la URL está vacía, devuelve `""`.
  - Si ya empieza con `http://` o `https://`, la deja igual (preserva entornos dev/proxy con `http://`).
  - En cualquier otro caso, antepone `https://`.
  - Se aplica tanto a `verification_uri` como a `verification_uri_complete`.
  - **Fallback**: si `verification_uri_complete` viene vacío, se construye como `f"{verification_uri}/{user_code}"`.
- **Backend legacy** — `backend/app/modules/auth/service.py`: misma función `_ensure_https`, aplicada a `verification_uri_complete` en `DeviceAuthResponse`.
- **Frontend** — `frontend/src/features/auth/api/auth.api.ts`: función `ensureHttps()` (misma lógica) aplicada a `verification_uri` y `verification_uri_complete` recibidos del backend, con el mismo fallback `verificationUri + "/" + userCode` si `verificationUriComplete` viene vacío. Esto es una **defensa en profundidad** — el backend ya normaliza, pero el frontend no asume que siempre lo hará.
- Se añadieron **14 tests unitarios nuevos** para `_ensure_https` y `start_device_auth` (en `backend/tests/test_session_service.py`).

**Pasos de diagnóstico**:
1. `cd backend && uv run pytest tests/test_session_service.py -v -k ensure_https` — confirma que la normalización sigue activa.
2. Inspeccionar la respuesta real: `curl -X POST http://localhost:8000/session/device-auth` — el campo `verification_uri_complete` debe empezar por `https://` (o `http://` si así lo devuelve Tidal explícitamente).
3. En el navegador, verificar que el `<a href>` del código de usuario en `/login` apunte a una URL absoluta (DevTools → inspeccionar el enlace), no a `/link.tidal.com/...`.
4. Si Tidal cambia el formato de respuesta (p. ej. deja de incluir `verification_uri_complete`), el fallback `verification_uri + "/" + user_code` debe seguir produciendo una URL válida — verificar manualmente abriendo esa URL.

---

## 4. WebSocket — problemas conocidos

### 4.1 Test `test_pubsub_unsubscribed_on_disconnect` falla

**Problema**: `backend/tests/test_ws_downloads.py::TestCleanup::test_pubsub_unsubscribed_on_disconnect` falla con:
```
AssertionError: Expected unsubscribe to have been awaited once. Awaited 0 times.
```

**Estado actual**: el código de `/ws/downloads` (`backend/app/modules/download/ws.py`) **sí** implementa la limpieza en un bloque `finally`:
```python
finally:
    relay.cancel()
    await asyncio.gather(relay, return_exceptions=True)
    try:
        await pubsub.unsubscribe(rc.REDIS_ALL_JOBS_CHANNEL)
    except Exception:
        pass
    try:
        await pubsub.aclose()
    except Exception:
        pass
    try:
        await websocket.close()
    except Exception:
        pass
```
Pero el test, que abre y cierra la conexión inmediatamente (`with client.websocket_connect("/ws/downloads"): pass`), no observa la llamada a `pubsub.unsubscribe`.

**Causa probable (no confirmada)**: posible condición de carrera entre el cierre del `TestClient` (que corre el ASGI app en un hilo/portal `anyio` separado) y la ejecución del bloque `finally` de `websocket_downloads` — el `with` del test puede completarse y hacer la aserción antes de que la tarea `relay` sea cancelada y el `finally` termine de ejecutarse. **No se ha confirmado si es un bug del código o un problema de timing del test.**

**Pasos de diagnóstico**:
1. Reproducir: `cd backend && uv run pytest tests/test_ws_downloads.py::TestCleanup -v --tb=long`.
2. Añadir un pequeño `await asyncio.sleep(0)` (o usar `anyio.sleep`) entre el `with client.websocket_connect(...)` y la aserción, para dar tiempo a que el `finally` corra — si el test pasa con ese cambio, confirma que es un problema de timing del test, no del endpoint.
3. Revisar si `TestClient.websocket_connect` envía realmente un mensaje `websocket.disconnect` al salir del `with`, o si simplemente cierra el socket sin que el servidor lo procese de forma síncrona dentro del mismo test.
4. Si se confirma timing: ajustar el test (no el endpoint). Si se confirma bug real: verificar que `relay.cancel()` + `asyncio.gather(relay, return_exceptions=True)` efectivamente desbloquea antes de llegar a `pubsub.unsubscribe`.

### 4.2 Dos canales de progreso conviven

`publish_progress()` publica en **dos** canales Redis simultáneamente: el canal legacy por-job (`music4all:job:{job_id}:progress`, consumido por `/ws/progress/{job_id}`) y el canal global (`music4all:progress:all`, consumido por `/ws/downloads`). Si se modifica el formato del mensaje publicado, **ambos** consumidores (`ws.py` legacy y `ws_mapper.py` para el unificado) deben actualizarse — `flat_to_spec_message()` en `ws_mapper.py` es el punto único de transformación para `/ws/downloads`.

### 4.3 Heartbeat

`/ws/downloads` espera mensajes del cliente con `timeout=35s`; si no llega nada, envía `{"type": "server_ping"}`. El cliente debe responder a `{"type": "ping"}` con `{"type": "pong", "timestamp": ...}`. Si un proxy/nginx tiene un timeout de conexión inferior a 35s para `/ws/`, la conexión se cerrará antes del primer heartbeat — verificar `proxy_read_timeout`/`proxy_send_timeout` en `infrastructure/nginx/conf.d/music4all.conf` (actualmente `3600s`, suficiente).

---

## 5. Valkey — problemas conocidos

### 5.1 Migración de Redis a Valkey

**Contexto**: el proyecto migró el servicio de cache/cola de `redis:7-alpine` a `valkey/valkey:8-alpine` (commit `84c058e`, "migrate redis to valkey").

**Cambios realizados**:
- Servicio renombrado de `redis` → `valkey` en `docker-compose.yml` (imagen, healthcheck `valkey-cli ping`, comando `valkey-server --appendonly yes`).
- Volumen renombrado `redis_data` → `valkey_data`.
- `backend.environment.REDIS_URL` cambió de `redis://redis:6379` → `redis://valkey:6379`.
- **La variable de entorno sigue llamándose `REDIS_URL`** y el código backend sigue usando `redis.asyncio` (`backend/app/core/redis_client.py`) sin cambios — Valkey es compatible con el protocolo RESP2/RESP3 y con el cliente `redis-py`.
- `.env.example` documenta: "Dev local sin Docker: instalar Valkey o Redis 7; Docker levanta `valkey/valkey:8-alpine` automáticamente".

**Inconsistencia conocida (no corregida)**: el job `test-backend` de CI (`.github/workflows/ci.yml`) todavía usa el servicio `redis:7-alpine`, mientras que `docker-compose.yml` local usa `valkey/valkey:8-alpine`. Funcionalmente equivalente (mismo protocolo, mismo cliente), pero es una divergencia entre el entorno de CI y el entorno de desarrollo/producción local. Ver `docs/roadmap.md`.

**Pasos de diagnóstico**:
1. Verificar que el servicio responda: `docker compose exec valkey valkey-cli ping` → `PONG`.
2. Verificar conectividad desde el backend: `docker compose exec backend uv run python -c "import asyncio, redis.asyncio as r; asyncio.run(r.from_url('redis://valkey:6379').ping())"`.
3. Si el backend no arranca por timeout de conexión a Redis/Valkey: confirmar `depends_on: valkey: condition: service_healthy` en `docker-compose.yml` y que el healthcheck (`valkey-cli ping`, interval 10s, retries 3) esté pasando (`docker compose ps`).
4. Si se ejecutan tests localmente fuera de Docker contra un Redis real (no Valkey) instalado en el host, debería funcionar igual por compatibilidad de protocolo — si no, revisar la versión de `redis-py` instalada (`uv run python -c "import redis; print(redis.__version__)"`).

---

## 6. Otros problemas registrados (referencia)

### 6.1 `.gitignore` ocultaba código fuente del frontend (resuelto)

Un patrón `downloads/` sin anclar en `.gitignore` (sección Python) coincidía también con `frontend/src/features/downloads/` y `frontend/src/app/(app)/downloads/`, dejándolos **fuera de git** desde su creación. Resuelto anclando el patrón a `/downloads/` (solo carpeta raíz de descargas) y añadiendo explícitamente los archivos previamente invisibles (commit `056688f`).

### 6.2 Tests de integración fallando por `KeyError: 'engine'`

`tests/integration/test_download_flow.py::TestDownloadError::test_invalid_track_id` y `::test_invalid_job_id` fallan con `KeyError: 'engine'` al acceder a `request.app.state.engine` — el fixture de esos tests no inicializa `app.state.engine` antes de la petición. Ver `docs/roadmap.md` (deuda técnica).
