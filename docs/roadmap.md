# Roadmap — Music 4 All

Estado de pendientes, deuda técnica, mejoras futuras y riesgos conocidos, basado en el estado real del repositorio.

> **Última actualización: 2026-07-04** (saneamiento de repo). Varios ítems previos ya resueltos se corrigieron en esta pasada.

---

## 1. Pendientes actuales

### Frontend
- **`/library` y `/settings`** (`(app)/library/page.tsx`, `(app)/settings/page.tsx`) son placeholders (`return null`) — sin implementación.
- **`AlbumDetailPanel`** (Phase 6C) no está conectado — `handleOpenAlbum` en `DashboardClient.tsx` solo hace `console.info`.
- **RM-03 (sesión vía cookie httpOnly)**: `middleware.ts` tiene el scaffolding (`PROTECTED_PATHS`, `AUTH_PATHS`, `matcher`) pero el cuerpo no aplica redirecciones — la protección de rutas es 100% client-side (rehidratación de `auth.store`). Pendiente: backend debe emitir cookie `session_id` httpOnly y el middleware debe activarse.
- **Rediseño "neón retro 90s"**: el **Login ya está implementado** (letrero neón Monoton "moribundo", commits `852c72d`/`ea184c1`); el **Dashboard sigue pendiente**. Ver sección 3.

> El ítem previo "limpieza de código legacy pendiente" (`src/store/`, `src/components/`, `src/hooks/`, `src/lib/`, carpetas de ruta vacías) **ya no aplica**: esos directorios no existen — el frontend está 100% en FSD.

### Backend
- Sin pendientes funcionales nuevos identificados más allá de la deuda técnica de la sección 2 — el núcleo de descarga, búsqueda, sesión, jobs e historial está implementado y en uso.

---

## 2. Deuda técnica

### 2.1 Ruff (lint backend)
- `ruff check .` **pasa limpio** (sin errores). Los 104 errores previos (mayoría `F401`) ya fueron resueltos.

### 2.2 mypy (type-check backend)
- **49 errores en 11 archivos** (`mypy` no estricto, `ignore_missing_imports = true`). Ejemplos identificados:
  - `app/modules/search/repository.py:187,190,199` — tipos `int` vs `str | None` en llamadas a `.album()` / `.track()` de tidalapi.
  - `app/modules/metadata/repository.py:33,45,64` — tipo de `SearchResult.title` y asignación a `Album`.
  - `app/modules/download/repository.py:15,20,22,27` — acceso a atributos de `Artist | None` / `Album | None`, asignación de `str | None`.
  - `app/modules/search/router.py:28,46,48,66,68` y `app/modules/jobs/router.py:34,36` — referencias a atributos `UserNotLoggedIn` / `ItemNotFound` que no existen en el módulo de excepciones de `tidalapi` tal como se importa.
  - `app/main.py:112` — el handler de `RateLimitExceeded` tiene un tipo incompatible con la firma esperada por `add_exception_handler`.
- No bloquea CI (no hay job `mypy` en `.github/workflows/ci.yml`).

### 2.3 Estado de tests (en verde)
- Backend: **176 pasan, 2 skip** (guards `skipif` por `ffmpeg`/`ffprobe` no en PATH); suite ~2s.
- Frontend: **98 pasan** (Vitest + Testing Library) más e2e con Playwright.
- Los 3 tests que antes fallaban (`test_download_flow` `KeyError: 'engine'`, `test_ws_downloads` race) ya están resueltos.
- El job `test-backend` de CI aún usa `pytest ... || echo "No tests found — skipping"`; ahora que la suite está verde conviene activar el bloqueo (ver sección 4).

### 2.4 Inconsistencia Redis/Valkey entre entornos
- `docker-compose.yml` (local/producción) usa `valkey/valkey:8-alpine`; `.github/workflows/ci.yml` (`test-backend`) usa `redis:7-alpine`. Compatible vía protocolo RESP, pero son imágenes distintas en CI vs. desarrollo — riesgo bajo pero a documentar/unificar.

### 2.5 Testing de frontend (implementado)
- Configurados **Vitest + Testing Library** (98 tests unitarios) y **Playwright** (e2e). Ya no depende solo de `pnpm lint` + `pnpm build`.

### 2.6 OpenTelemetry sin collector externo
- `TracerProvider` usa `ConsoleSpanExporter` — las trazas se imprimen en logs/consola, no se envían a un backend de trazas (Tempo/Jaeger/etc.). Si se requiere tracing real, falta configurar un exportador OTLP y un collector.

### 2.7 `SECRET_KEY` con valor default
- `.env.example` define `SECRET_KEY=change-me-in-production` — verificar que cualquier despliegue real sobreescriba este valor (no se ha confirmado dónde se usa actualmente `SECRET_KEY` en el código de la app).

---

## 3. Mejoras futuras (analizadas, no implementadas)

### 3.1 Rediseño visual "tienda de discos nocturna de los 90" — Dashboard
Analizado en sesión previa: veredicto "capa visual compatible si se aplica por fases, no un reemplazo total". Orden recomendado de implementación: D → A → F → C → B → G → E (decoración/partículas primero, integraciones más invasivas al final). Requiere:
- Nuevo componente `NeonParticles` (reutilizable también en Login).
- Extensión de `tailwind.config.ts` con paleta neón (mapeada sobre tokens `teal-*`/`synthwave-*`/`semantic-*` existentes donde sea posible).
- Resolver transición de página (AnimatePresence) sin desmontar el WebSocket singleton de `DownloadPanel`.
- Atender el gap de `prefers-reduced-motion` (no manejado actualmente en ningún punto del frontend).

### 3.2 Rediseño visual "puerta de tienda de discos nocturna" — Login
> **IMPLEMENTADO (2026-07, commits `852c72d` → `ea184c1`)**: letrero neón `Monoton` morado/rosa "moribundo" (parpadeo caótico por letra, reencendido por falso contacto), arcos eléctricos, marco neón, fondo negro absoluto, código OAuth en tubos retro y countdown de expiración — respetando `prefers-reduced-motion` y WCAG 2.3.1. Lo siguiente documenta el análisis previo que guió la implementación.

Analizado: el login es buen candidato a rediseño casi completo (página autocontenida, máquina de estados pequeña y bien definida). Orden recomendado: vinilo girando durante polling → "puerta de vidrio" (Card + `backdrop-blur`) → glitch de error → display retro del código OAuth → letrero neón con parpadeo → partículas/humo con parallax → countdown de expiración → animación puerta abre/cierra → transición cross-layout a Dashboard (compartida con 3.1) → escena decorativa completa (opcional/iterativo).

Requiere:
- 3 fuentes nuevas (Press Start 2P, VT323, Montserrat) vía `next/font/google` en `app/layout.tsx` + nuevos tokens `fontFamily` en `tailwind.config.ts`.
- Countdown de expiración: única pieza con lógica nueva real — derivar de `DeviceAuthCode.expiresIn` (ya existe en `entities/session/session.types.ts`), capturando el timestamp de emisión.
- Preservar intactos: `<a href={verificationUriComplete}>` real, `userCode`, `aria-live`/`role="alert"`, polling dinámico (`useDeviceAuthPollingQuery`).

### 3.3 Plan Maestro v2.0 — fases generales (memoria de proyecto)
El plan formal de 7 fases (migración frontend → Next.js/pnpm; Redis + sesiones/historial; PostgreSQL + auditoría; colas/workers + Pub/Sub; Docker + Nginx + CI/CD; observabilidad; hardening + carga) está **sustancialmente completado** según la estructura actual del repo (frontend Next.js, backend modular con Redis/Valkey + Postgres + worker + Pub/Sub, Docker Compose completo con nginx/Prometheus/Grafana/Loki, CI con lint/build/tests/bandit/docker-build, y `tests/load/locustfile.py` para carga). Pendiente formalizar: testing frontend (Vitest/RTL/Playwright, mencionado en el plan original pero no implementado).

---

## 4. Riesgos conocidos

| Riesgo | Detalle | Mitigación sugerida |
|---|---|---|
| **Fotosensibilidad / WCAG 2.3.1** | Las propuestas de rediseño neón incluyen parpadeos de letreros, "láser" de escaneo y efectos glitch — pueden exceder el límite de 3 destellos/segundo y afectar a usuarios con epilepsia fotosensible. | Limitar frecuencia/contraste de animaciones; implementar y respetar `prefers-reduced-motion` (gap actual). |
| **`prefers-reduced-motion`** | **Ya manejado**: hook `useReducedMotion()` + guard en `globals.css`; el rediseño del Login lo respeta (letrero fijo, sin arcos ni parpadeo). Mantener el patrón en el Dashboard. | Reutilizar `useReducedMotion` en toda animación nueva. |
| **Transición de página cross-layout (Login → Dashboard)** | Login vive en `(auth)/layout.tsx` (pass-through) y Dashboard en `(app)/layout.tsx` (shell con WS singleton) — una animación de transición "puerta cierra + flash" que cruce ambos layouts requiere un overlay a nivel de `app/layout.tsx` raíz o coordinación cuidadosa con `router.replace`. | Resolver una sola vez como componente compartido, no duplicar entre Dashboard y Login. |
| **Dependencia de formato de respuesta de Tidal (Device Auth)** | El fix de `_ensure_https` asume que Tidal devuelve `verification_uri`/`verification_uri_complete` como hostname sin esquema o ausente; si Tidal cambia el formato (p. ej. devuelve una URL ya completa con query params distintos), el fallback `verification_uri + "/" + user_code` podría producir una URL incorrecta. | Cubierto parcialmente por los 14 tests de `_ensure_https`; revisar si Tidal cambia su SDK/API. |
| **`backend_venv` como volumen nombrado** | Si un desarrollador borra el volumen `backend_venv` sin reconstruir la imagen, o ejecuta `uv sync` desde Windows dentro de `backend/`, puede reintroducir el problema de `.venv` cruzado (troubleshooting #1/#2). | Documentado en `docs/troubleshooting.md`; no automatizado. |
| **CSP con `unsafe-inline`/`unsafe-eval`** | `infrastructure/nginx/conf.d/music4all.conf` permite `script-src 'self' 'unsafe-inline' 'unsafe-eval'` — necesario hoy para Next.js, pero amplía la superficie de XSS. | Revisar si Next.js 14 permite endurecer la CSP (nonces) sin romper la app. |
| **HSTS deshabilitado** | Comentado en nginx — correcto mientras no haya TLS, pero debe activarse junto con HTTPS en cualquier despliegue real. | Activar al configurar TLS en producción. |
| **CI no bloquea en fallos de pytest** | `test-backend` usa `|| echo "No tests found — skipping"`, por lo que un fallo de pytest no impide merges. La suite ya está en verde (176 pasan), así que es buen momento para activar el bloqueo. | Quitar el `|| echo ...` para que CI falle ante regresiones. |
