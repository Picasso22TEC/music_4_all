# E2E Validation Checklist — Music 4 All

Checklist para validar manualmente (o de forma semi-automatizada) el sistema completo en un entorno levantado con `docker compose up --build` (o backend/frontend locales). Marcar cada punto al validarlo.

---

## 1. Backend

- [ ] `GET /health` responde `{"status": "healthy", "service": "Music 4 All API", "version": "7.0.0"}`.
- [ ] `GET /docs` accesible **solo** cuando `DEBUG=true`; en producción (`DEBUG=false`) debe devolver 404.
- [ ] `GET /metrics` expone métricas Prometheus (`downloads_total`, `downloads_in_progress`, `download_duration_seconds`, `tracks_downloaded_total`, `downloads_concurrency_limit`, métricas HTTP estándar de `prometheus-fastapi-instrumentator`).
- [ ] Al arrancar, los logs muestran `"Starting Music 4 All API"` (JSON estructurado) y no hay excepciones en la creación de tablas (`Base.metadata.create_all`).
- [ ] CORS: una petición desde `http://localhost:3000` (origen permitido) no es bloqueada; una petición desde un origen no listado en `cors_origins` es rechazada.
- [ ] Rate limiting activo: superar `5/minute` en `POST /session/device-auth` devuelve 429.
- [ ] Manejo de errores: una petición que dispara `ApiException` devuelve `{"error": {"code", "message", "http_status", "retriable"}}`; un error de validación (422) devuelve el mismo formato con `code: "SERVER_ERROR"`.

## 2. Frontend

- [ ] `pnpm build` (o `next build` en Docker target `builder`) compila sin errores de tipos.
- [ ] `pnpm lint` no reporta errores ni warnings.
- [ ] `/` redirige a `/dashboard` (si autenticado) o a `/login` (si no autenticado, vía guard client-side de `auth.store`).
- [ ] Carátulas de álbum (`resources.tidal.com`) cargan correctamente en `/dashboard` (verifica `images.unoptimized: true` en `next.config.mjs`).
- [ ] `/library` y `/settings` cargan sin error (placeholders — render vacío es esperado, **no** debe haber error 500/cliente).
- [ ] Navegación entre `/dashboard`, `/downloads`, `/history` mantiene el shell (`Sidebar`, `AppHeader`, `PlayerBar`, `DownloadPanel`) montado sin remount visible del panel de descargas.

## 3. OAuth (login)

- [ ] `/login` muestra el botón "Connect with Tidal" en estado inicial (sin `deviceAuth`).
- [ ] Al hacer click, `POST /session/device-auth` se llama (verificar en Network) y la UI pasa al estado de `deviceAuth` pendiente: muestra `userCode` y un enlace de verificación.
- [ ] El enlace de verificación (`verificationUriComplete`) es una **URL absoluta** (`https://...`), nunca una ruta relativa — abrirlo en una pestaña nueva debe llevar a la página de activación de Tidal, **no** a un 404 (ver `docs/troubleshooting.md` #3).
- [ ] Si Tidal no devuelve `verification_uri_complete`, el fallback `verification_uri + "/" + user_code` produce igualmente una URL válida.
- [ ] Tras autorizar en Tidal (desde otro dispositivo/pestaña), el polling detecta `status: "authorized"` y la app redirige automáticamente a `/dashboard`.
- [ ] `GET /session/status` tras autenticarse devuelve `status: "active"`, `user` (id, email, countryCode, plan) y `expires_at`.
- [ ] Cerrar sesión (`logout` / expiración) deja `auth.store.status` en `expired`/`unauthenticated` y redirige a `/login`.
- [ ] Tras refrescar la página estando autenticado, la sesión persiste (rehidratación de `auth.store` desde `localStorage` — solo `status`, `user`, `expiresAt`).
- [ ] Si `expiresAt` ya pasó al rehidratar, `status` se marca como `expired` automáticamente (`onRehydrateStorage`).

## 4. Device Flow (detalle)

- [ ] `POST /session/device-auth` devuelve `device_code`, `user_code`, `verification_uri`, `verification_uri_complete`, `expires_in`, `interval`.
- [ ] `GET /session/device-auth/{device_code}` antes de autorizar devuelve `status: "pending"`.
- [ ] El polling del frontend usa el `interval` devuelto por el backend (no un valor fijo) — verificar en Network que el tiempo entre llamadas a `GET /session/device-auth/{device_code}` coincide aproximadamente con `interval` segundos.
- [ ] Si el código expira o es denegado, `GET /session/device-auth/{device_code}` devuelve 400 `DEVICE_AUTH_EXPIRED` y el frontend:
  - [ ] limpia `deviceAuth` (`clearDeviceAuth()`),
  - [ ] muestra un mensaje de error visible (`role="alert"`),
  - [ ] permite reintentar (vuelve al botón inicial "Connect with Tidal").
- [ ] Tras autorizar, `GET /session/device-auth/{device_code}` devuelve `status: "authorized"` junto con `user` y `expires_at`.

## 5. WebSocket (`/ws/downloads`)

- [ ] Conexión sin sesión válida: el servidor acepta y cierra inmediatamente con código **1008** (Policy Violation).
- [ ] Conexión con sesión válida: permanece abierta.
- [ ] Enviar `{"type": "ping"}` desde el cliente recibe `{"type": "pong", "timestamp": <epoch ms>}`.
- [ ] Si no hay actividad del cliente por ~35s, el servidor envía `{"type": "server_ping"}`.
- [ ] Al iniciar una descarga, llegan mensajes `job_started` y `progress` (con `progress_percent`, `current_track_filename`, `completed_tracks`, `total_tracks`) por este canal.
- [ ] Al cerrar la conexión (cerrar pestaña / navegar fuera), no quedan suscripciones huérfanas en Redis (`PUBSUB CHANNELS` en `valkey-cli` no debe acumular canales tras desconexiones repetidas) — nota: el test automatizado de esta limpieza falla actualmente (`docs/troubleshooting.md` #4.1), validar manualmente.
- [ ] `/ws/progress/{job_id}` (legacy, sin auth) sigue funcionando para un `job_id` válido — envía el estado actual inmediatamente al conectar y se cierra solo si el job ya está `completed`/`failed`.

## 6. Descargas

- [ ] Buscar un álbum en `/dashboard` (texto ≥ 2 caracteres) devuelve resultados de `GET /search`.
- [ ] Pegar una URL de Tidal válida activa `GET /resolve` y muestra el álbum/track resuelto.
- [ ] Seleccionar calidad (`MASTER`/`HIRES`/`HIGH`/`NORMAL`) vía `QualitySelector` y lanzar descarga llama a `POST /downloads` con `{album_id|track_id, quality}`.
- [ ] `POST /downloads` devuelve `{job_id, status: "queued", estimated_tracks}` y el job aparece inmediatamente en `DownloadPanel` (vía `enqueue()`).
- [ ] El progreso del job se actualiza en tiempo real (vía `/ws/downloads`) tanto en `DownloadPanel` como en `/downloads`.
- [ ] Acciones de control funcionan: **pausar** (`PATCH /downloads/{job_id} {"action":"pause"}`), **reanudar** (`"resume"`), **reintentar** (`"retry"`), **cancelar** (`DELETE /downloads/{job_id}`).
- [ ] Al completarse un job, `GET /download/file/{job_id}` (legacy) permite descargar el archivo resultante.
- [ ] Concurrencia: lanzar más de `max_concurrent_downloads` (default 3) jobs deja los excedentes en estado `queued` hasta que se libera un slot.
- [ ] Reiniciar el backend con jobs `in-progress` pendientes: al arrancar, `reconcile_stale_jobs` los marca como fallidos (no quedan jobs "zombie" en estado `downloading` para siempre).

## 7. Historial

- [ ] Tras completar una descarga, aparece un registro nuevo en `GET /history` (title, artist, quality, cover_url, job_id, downloaded_at).
- [ ] `/history` (frontend) muestra la lista ordenada por fecha descendente.
- [ ] `GET /history/stats` devuelve estadísticas agregadas (verificar que no lance error con historial vacío y con historial poblado).
- [ ] Los registros persisten tras reiniciar el contenedor `backend` (datos en `postgres_data`, no en memoria).

## 8. Docker

- [ ] `docker compose up --build` levanta todos los servicios sin errores: `postgres`, `valkey`, `backend`, `frontend`, `nginx`, `prometheus`, `grafana`, `loki`, `promtail`.
- [ ] `docker compose ps` muestra `postgres` y `valkey` como `healthy` antes de que `backend` arranque (`depends_on: condition: service_healthy`).
- [ ] `docker compose exec backend uv run python -c "import certifi; print(certifi.where())"` devuelve una ruta Linux existente (ver `docs/troubleshooting.md` #1/#2).
- [ ] Hot-reload backend: editar un archivo en `backend/app/` con el contenedor corriendo reinicia uvicorn (`--reload`) sin reconstruir la imagen.
- [ ] Hot-reload frontend: editar un archivo en `frontend/src/` refleja el cambio en `http://localhost:3000` sin reconstruir.
- [ ] `http://localhost` (nginx) sirve el frontend, proxea `/api/*` y `/ws/*` al backend, y `/health` responde sin pasar por el frontend.
- [ ] Headers de seguridad presentes en respuestas de nginx: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Content-Security-Policy`.
- [ ] `docker compose down` (sin `-v`) preserva los datos al volver a levantar (`postgres_data`, `valkey_data`, `backend_venv`).

## 9. Observabilidad

- [ ] Prometheus (`http://localhost:9090`) tiene como target `backend:8000/metrics` con estado `UP`.
- [ ] Grafana (`http://localhost:3001`, admin/admin) tiene provisionados los datasources Prometheus y Loki sin configuración manual.
- [ ] El dashboard `music4all.json` carga y muestra paneles (aunque estén vacíos sin tráfico).
- [ ] Loki recibe logs: en Grafana → Explore → Loki, una query por el label del contenedor `backend` devuelve líneas de log recientes.
- [ ] Los logs del backend son JSON estructurado (campo `level`, `message`, timestamp) — verificar en Loki o `docker compose logs backend`.
- [ ] Generar tráfico (búsquedas + descargas) incrementa `downloads_total` y `tracks_downloaded_total` visibles en Prometheus (`http://localhost:9090/graph`).
- [ ] Trazas de OpenTelemetry aparecen en los logs/consola del backend (`ConsoleSpanExporter` — no hay collector externo configurado, por lo que **no** se esperan trazas en un backend externo).
