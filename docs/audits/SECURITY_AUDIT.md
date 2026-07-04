# Security Audit — Music 4 All

> **AVISO — Auditoría histórica.** Es una foto de un estado anterior del repo; varios hallazgos pueden estar ya resueltos (otros de seguridad pueden seguir vigentes). Verificar cada uno contra el estado actual antes de accionar. Estado vigente en `docs/roadmap.md`.

> **Estado de vigencia — revisado 2026-07-02.** Documento puntual (~jun-2026).
> - **Ya resuelto:** **SEC-07/TD-07** — `SECRET_KEY` eliminado de `.env.example`; **SEC-09/TD-04** — Bandit ahora bloqueante en CI.
> - **Actualización de matiz — SEC-06:** `frontend/src/middleware.ts` ya **no** es un scaffold sin activar; hoy hace redirección de rutas con la cookie **no-httpOnly** `music4all_session` (RM-03 con cookie httpOnly sigue pendiente). El CSRF sigue sin aplicar hoy (la cookie no se usa como credencial server-side).
> - **Sin verificar en esta revisión (presumiblemente vigentes):** SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-08 (configuración de infra/Nginx/compose, no modificada).

> Auditoría de seguridad del backend (FastAPI), frontend (Next.js), infraestructura (Docker Compose, Nginx) y CI/CD. Basada en lectura directa de código/configuración y ejecución local de Bandit. Complementa [`TECHNICAL_AUDIT.md`](TECHNICAL_AUDIT.md) (TD-04, TD-07) y [`ARCHITECTURE_AUDIT.md`](ARCHITECTURE_AUDIT.md) (AR-02, estado en memoria).
>
> **Contexto de despliegue asumido**: Music 4 All es una herramienta **autohospedada, de un solo usuario** (no un servicio multi-tenant expuesto públicamente). Varios hallazgos que serían Critical en un SaaS multi-tenant se clasifican como Medium en este contexto, pero se marca explícitamente la condición bajo la cual escalarían a Critical (p. ej., exposición a una red no confiable).

---

# Executive Summary

No se identificaron vulnerabilidades de severidad **Critical** explotables en el contexto de despliegue actual (autohospedado, instancia única, red local/controlada). Bandit (`-ll`, medium+high) reporta **0 hallazgos** sobre `backend/app/`.

Los hallazgos relevantes son de naturaleza **arquitectónica y de configuración por defecto**:

1. **No existe aislamiento de sesión por usuario** en la capa API v2 — toda la API opera sobre una única sesión Tidal compartida a nivel de servidor (SEC-01).
2. **Credenciales débiles hardcodeadas** en `docker-compose.yml` (Postgres `music4all`/`music4all`, Grafana `admin`/`admin`) — aceptables solo si los puertos no son alcanzables desde fuera del host (SEC-03).
3. **CSP con `unsafe-inline`/`unsafe-eval`** y **HSTS deshabilitado** — necesario hoy para Next.js en dev/HTTP, pero debe revisarse antes de cualquier despliegue con TLS (SEC-04).
4. **Rate limiting documentado como Redis-backed pero implementado en memoria** — no es una vulnerabilidad per se, pero es una discrepancia entre el comentario del código y su comportamiento real (SEC-02).
5. **Sin escaneo automatizado de dependencias** (no hay Dependabot/Renovate/`pip-audit`/`npm audit` en CI) (SEC-05).

**Ningún hallazgo requiere acción de emergencia.** La prioridad más alta (SEC-01) es una decisión de **diseño de producto** (¿Music 4 All seguirá siendo single-user/self-hosted, o se planea multi-usuario?) más que un parche de seguridad puntual.

---

# Estado Actual

| Control de seguridad | Estado |
|---|---|
| CORS | Correctamente acotado (`cors_origins` configurable, sin `["*"]`) |
| Rate limiting (slowapi) | Activo pero en memoria (no Redis pese al comentario) |
| Almacenamiento de tokens OAuth | Redis con TTL, pero clave única global (`music4all:session`) |
| CSRF | ➖ No aplica hoy (sin cookies de sesión); riesgo latente si se implementa RM-03 |
| Headers de seguridad (Nginx) | CSP con `unsafe-inline`/`unsafe-eval`; HSTS comentado; falta `Permissions-Policy` |
| Secretos / variables de entorno | `SECRET_KEY` declarado sin uso; credenciales DB/Grafana hardcodeadas en compose |
| Bandit (SAST) | 0 hallazgos medium/high (ejecutado localmente); no bloqueante en CI |
| Dependencias vulnerables | ➖ [NO VERIFICABLE] — sin `pip-audit`/`npm audit`/Dependabot configurados |
| Autenticación/autorización por ruta | Verifica sesión Tidal del servidor, no identidad del llamante |
| WebSocket `/ws/downloads` | Cierra con 1008 si `engine.check_auth()` falla |
| Validación de URLs (`_ensure_https`) | Cumple su función (normalización de esquema); sin allowlist de dominio (bajo riesgo, origen confiable) |

---

# Hallazgos

## SEC-01 — Sin aislamiento de sesión por usuario en la API v2

- **Descripción**: los routers v2 (`session`, `search`, `downloads`/`jobs`) dependen de `get_engine`/`get_authenticated_engine` (`backend/app/dependencies.py:7-22`), que devuelven una instancia **única y compartida** de `TidalDownloader` (`app.state.engine`). `get_authenticated_engine` solo verifica `engine.check_auth()` — es decir, si **la sesión del servidor** está autenticada con Tidal, no si **el llamante** tiene una identidad válida. No hay token/header/cookie que identifique al llamante.
- **Evidencia**: research SECURITY_AUDIT punto 9; `backend/app/dependencies.py:7-22`; sesión almacenada bajo una única clave Redis `music4all:session` (`backend/app/core/redis_client.py:7,25-27`).
- **Impacto técnico**: cualquier cliente que pueda alcanzar la API (en la red donde corre el backend) puede usar la sesión Tidal activa — iniciar descargas, ver historial, cerrar la sesión, etc. — sin proporcionar ninguna credencial propia.
- **Impacto de negocio**: para el modelo actual (un usuario, autohospedado, backend no expuesto a Internet) esto es **por diseño** y de bajo riesgo. **Se convierte en High/Critical** si: (a) el backend se expone directamente a Internet sin un proxy autenticado adicional, o (b) se evoluciona hacia un modelo multi-usuario.
- **Recomendación**: (1) documentar explícitamente esta restricción en `docs/architecture.md` y en cualquier guía de despliegue ("Music 4 All no debe exponerse directamente a redes no confiables sin un proxy de autenticación adicional, p. ej. Authelia/Tailscale/VPN"); (2) si el roadmap contempla multi-usuario, esto requiere un rediseño de sesión (tokens por usuario, namespacing de claves Redis por usuario) — **no implementar de forma parcial/especulativa**.
- **Esfuerzo estimado**: XS (documentación) / XL (multi-usuario real, fuera de alcance).
- **Prioridad**: P1 (documentar ahora), P3/futuro (rediseño multi-usuario, solo si aplica).
- **Severidad**: **High** (arquitectónico, condicionado a exposición de red).

## SEC-02 — Rate limiting documentado como Redis-backed pero implementado en memoria

- **Descripción**: `backend/app/core/rate_limiter.py:7-11` instancia `Limiter(key_func=get_remote_address, default_limits=["200/minute"], storage_uri=None)` con un comentario que indica "se configura en main.py con REDIS_URL" — pero `main.py` **nunca** establece `storage_uri`. Con `storage_uri=None`, slowapi usa almacenamiento **en memoria** (por proceso).
- **Evidencia**: research SECURITY_AUDIT punto 2. Endpoints y límites confirmados: `/session/device-auth` (5/min), `/session/device-auth/{device_code}` (120/min), `/session/status` (30/min), `/auth/device` (5/min), `/auth/status` (30/min), `/auth/logout` (10/min), `/download/*` (10-60/min), `/jobs` (10-60/min), `/metadata` (30/min), `/search/*` (30/min ×3).
- **Impacto técnico**: con una sola instancia de backend (configuración actual), el rate limiting funciona correctamente. Si se escalara a múltiples réplicas (ver `ARCHITECTURE_AUDIT.md` AR-02), cada réplica tendría su propio contador — un atacante podría multiplicar efectivamente el límite por el número de réplicas.
- **Impacto de negocio**: bajo hoy (instancia única). El riesgo real es la **discrepancia documentación/código** — alguien podría asumir protección Redis-backed que no existe.
- **Recomendación**: (1) corregir el comentario en `rate_limiter.py` para reflejar la realidad (in-memory, por proceso); (2) si se desea backing real en Redis, pasar `storage_uri=settings.redis_url` al `Limiter` — pero **solo si** se planea escalado horizontal (de lo contrario es complejidad innecesaria).
- **Esfuerzo estimado**: XS (corregir comentario) / S (Redis backing real, si aplica).
- **Prioridad**: P2.
- **Severidad**: **Medium**.

## SEC-03 — Credenciales débiles hardcodeadas en `docker-compose.yml`

- **Descripción**: `docker-compose.yml` define en texto plano: `POSTGRES_USER=music4all`, `POSTGRES_PASSWORD=music4all`, `POSTGRES_DB=music4all`, `DATABASE_URL=postgresql://music4all:music4all@postgres:5432/music4all`, y `GF_SECURITY_ADMIN_USER=admin` / `GF_SECURITY_ADMIN_PASSWORD=admin` para Grafana — ninguno proviene de variables de entorno externas (`.env` + `${VAR}`), sino que están escritos directamente en el archivo versionado.
- **Evidencia**: research SECURITY_AUDIT punto 6 y research OPERATIONS punto 4. Además, `postgres` (5432) y `valkey` (6379) publican sus puertos al host (`docker-compose.yml`).
- **Impacto técnico**: si el host donde corre `docker compose` tiene estos puertos accesibles desde una red no confiable (p. ej. un VPS sin firewall, o una red doméstica compartida), un atacante en esa red podría conectarse directamente a Postgres con `music4all`/`music4all` o a Grafana con `admin`/`admin` y obtener acceso de administrador al dashboard (incluyendo, potencialmente, ejecutar queries via el datasource de Prometheus/Loki).
- **Impacto de negocio**: para desarrollo local (`localhost`) el riesgo es bajo. **Crítico** si `docker-compose.yml` se usa tal cual en un VPS con IP pública sin firewall adicional.
- **Recomendación**: (1) mover estas credenciales a variables de entorno (`.env`, no versionado) con valores fuertes generados por despliegue, manteniendo `.env.example` con placeholders claros (`CHANGE_ME`); (2) no publicar los puertos de `postgres`/`valkey` al host salvo que se necesite acceso externo explícito (usar la red interna de Docker Compose, a la que `backend` ya tiene acceso sin `ports:`); (3) documentar en una guía de despliegue que estas credenciales **deben** cambiarse antes de exponer el host.
- **Esfuerzo estimado**: S.
- **Prioridad**: **P0** si se planea o ya existe un despliegue en host con IP pública; P2 si el uso es exclusivamente local.
- **Severidad**: **Medium** (local) / **Critical** (host expuesto — condicional).

## SEC-04 — CSP con `unsafe-inline`/`unsafe-eval`, HSTS deshabilitado, sin `Permissions-Policy`

- **Descripción**: `infrastructure/nginx/conf.d/music4all.conf` define `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://resources.tidal.com; connect-src 'self' ws: wss:; font-src 'self';`. `Strict-Transport-Security` está comentado ("activar solo en producción con HTTPS"). No hay header `Permissions-Policy`. Sí están presentes: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- **Evidencia**: research SECURITY_AUDIT punto 5 y research OPERATIONS punto 9.
- **Impacto técnico**: `'unsafe-inline'`/`'unsafe-eval'` en `script-src` reducen significativamente la protección de la CSP contra XSS (permiten ejecutar scripts inline/`eval` inyectados). Esto es **requerido actualmente por Next.js** en modo desarrollo (`pnpm dev`/hot-reload) y posiblemente en producción según la configuración de Next.js 14 (hidratación, chunks inline). HSTS deshabilitado es correcto mientras no haya TLS, pero es un gap si se habilita HTTPS sin activar HSTS en el mismo cambio.
- **Impacto de negocio**: riesgo de XSS si existiera una vulnerabilidad de inyección en el frontend (no se ha identificado ninguna en este audit, pero la CSP actual no actuaría como mitigación secundaria).
- **Recomendación**: (1) investigar si Next.js 14 (App Router, `output: standalone` o similar) permite usar **nonces** por request para `script-src` en producción, eliminando `'unsafe-inline'`/`'unsafe-eval'` del build de producción (mantenerlos solo en el perfil de desarrollo de Nginx, si existen perfiles separados — `[REQUIERE VALIDACIÓN]` si existen configs Nginx diferenciadas dev/prod); (2) activar `Strict-Transport-Security` en el mismo cambio que se habilite TLS; (3) añadir `Permissions-Policy` restrictiva (p. ej. `geolocation=(), microphone=(), camera=()`) — bajo esfuerzo, mejora defense-in-depth.
- **Esfuerzo estimado**: S (Permissions-Policy) / M (investigación de nonces con Next.js 14) / XS (HSTS, al activar TLS).
- **Prioridad**: P2.
- **Severidad**: **Medium**.

## SEC-05 — Sin escaneo automatizado de dependencias vulnerables

- **Descripción**: no existe `dependabot.yml`, `renovate.json`, ni pasos de `pip-audit`/`safety`/`npm audit` en `.github/workflows/ci.yml`. `backend/pyproject.toml` usa rangos (`fastapi>=0.100.0`, resolviendo a 0.136.3) salvo `tidalapi==0.8.11` (pin exacto). `frontend/package.json` usa `next: ^14.2.0`, `axios: ^1.7.0`, `react: ^18.3.0`.
- **Evidencia**: research SECURITY_AUDIT punto 8.
- **Impacto técnico**: vulnerabilidades conocidas (CVEs) en dependencias directas o transitivas no se detectarían automáticamente. Next.js 14.x ha tenido CVEs de severidad media en versiones puntuales (p. ej. relacionadas con middleware) — el rango `^14.2.0` permite actualizaciones de parche/minor pero no garantiza que se apliquen sin un proceso explícito.
- **Impacto de negocio**: riesgo acumulativo a largo plazo — sin alertas automáticas, dependencias vulnerables pueden permanecer sin actualizar indefinidamente.
- **Recomendación**: (1) habilitar Dependabot (GitHub nativo, bajo esfuerzo — solo requiere `dependabot.yml` con `package-ecosystem: pip` y `npm`); (2) opcionalmente añadir `pip-audit` y `npm audit --audit-level=high` como jobs informativos (no bloqueantes inicialmente) en CI.
- **Esfuerzo estimado**: S.
- **Prioridad**: P2.
- **Severidad**: **Medium**.

## SEC-06 — Riesgo CSRF latente para RM-03 (sesión vía cookie httpOnly, pendiente)

- **Descripción**: actualmente no hay cookies de sesión (RM-03 — sesión vía cookie httpOnly — está pendiente, scaffolding sin activar en `frontend/src/middleware.ts`). El cliente Axios del frontend usa `withCredentials: true` (`frontend/src/shared/api/client.ts:9`) sin enviar ningún header de autenticación. La combinación `withCredentials: true` + `allow_credentials=True` en CORS (`backend/app/main.py`) es la configuración típica que **requiere** protección CSRF si se introducen cookies de sesión.
- **Evidencia**: research SECURITY_AUDIT puntos 3 y 4.
- **Impacto técnico**: **hoy, ninguno** — no hay cookies que un atacante pueda "montar" en una petición cross-site. El riesgo es puramente prospectivo: si RM-03 se implementa emitiendo una cookie `session_id` httpOnly **sin** `SameSite=Strict/Lax` y/o sin un token CSRF, las peticiones mutantes (`POST /downloads`, `DELETE /downloads/{job_id}`, etc.) serían vulnerables a CSRF desde cualquier origen permitido por CORS (o incluso fuera de CORS, ya que CSRF no depende de CORS).
- **Impacto de negocio**: ninguno hoy. Si se materializa sin mitigación, un sitio malicioso visitado por el usuario autenticado podría iniciar/cancelar descargas en su nombre.
- **Recomendación**: cuando se implemente RM-03, incluir en el mismo diseño: (a) `SameSite=Lax` (mínimo) o `Strict` para la cookie `session_id`; (b) verificación de header personalizado (p. ej. `X-Requested-With`) o token CSRF de doble-submit para mutaciones. **No requiere acción ahora** — se documenta como criterio de aceptación de RM-03.
- **Esfuerzo estimado**: incluido en el esfuerzo de RM-03 (no incremental si se diseña correctamente desde el inicio).
- **Prioridad**: P3 (condicionado a la implementación de RM-03).
- **Severidad**: **Low** (hoy) — escalaría a **Medium** si RM-03 se implementa sin estas mitigaciones.

## SEC-07 — `SECRET_KEY` declarado sin uso (cross-reference)

- Ver [`TECHNICAL_AUDIT.md` TD-07](TECHNICAL_AUDIT.md#td-07--secret_key-declarado-pero-sin-uso-configuración-muerta). Desde la perspectiva de seguridad, una variable `SECRET_KEY=change-me-in-production` en `.env.example` que **no se usa** es, en el mejor caso, ruido; en el peor, podría llevar a un despliegue futuro a asumir que está protegido por una firma/clave que no existe.
- **Severidad**: **Low** (duplicado de TD-07, incluido por completitud).

## SEC-08 — `_ensure_https`: normalización de esquema sin allowlist de dominio

- **Descripción**: `backend/app/modules/session/service.py:21-33` normaliza `verification_uri`/`verification_uri_complete` prefijando `https://` si la URL no tiene esquema. No valida que el dominio resultante sea `tidal.com` (o un dominio esperado).
- **Evidencia**: research SECURITY_AUDIT punto 10.
- **Impacto técnico**: el valor de entrada proviene de la respuesta de la librería `tidalapi` (API oficial de Tidal), no de input directo del usuario — la superficie de ataque es la integridad de la respuesta de Tidal, no el usuario final. Sin allowlist, si Tidal (o un MITM no detectado por TLS) devolviera una URL maliciosa, `_ensure_https` la pasaría sin objeción al frontend, que la renderiza como `<a href={verificationUriComplete}>`.
- **Impacto de negocio**: bajo — requiere comprometer la respuesta de la API de Tidal (canal HTTPS), escenario fuera del control de Music 4 All.
- **Recomendación**: opcional — añadir una validación de que el host resultante termina en `tidal.com` antes de pasarlo al frontend, como defensa en profundidad de bajo costo. No bloqueante.
- **Esfuerzo estimado**: XS.
- **Prioridad**: P3.
- **Severidad**: **Low**.

## SEC-09 — Bandit no bloqueante en CI (cross-reference)

- Ver [`TECHNICAL_AUDIT.md` TD-04](TECHNICAL_AUDIT.md#td-04--security-backend-bandit-no-bloqueante-en-ci). 0 hallazgos hoy, pero sin gate real para el futuro.
- **Severidad**: **Medium** (duplicado de TD-04, incluido por completitud).

---

# Riesgos

| ID | Riesgo | Severidad | Condición de escalado |
|---|---|---|---|
| SEC-01 | Sin aislamiento de sesión por usuario (API v2) | High | → Critical si se expone a Internet o se requiere multi-usuario |
| SEC-03 | Credenciales hardcodeadas DB/Grafana en compose | Medium | → Critical si host con IP pública sin firewall |
| SEC-02 | Rate limiting en memoria, documentado como Redis | Medium | → relevante solo si se escala horizontalmente |
| SEC-04 | CSP `unsafe-inline`/`unsafe-eval`, HSTS off, sin Permissions-Policy | Medium | → relevante al habilitar TLS / si aparece XSS |
| SEC-05 | Sin escaneo de dependencias | Medium | Constante, acumulativo |
| SEC-09/TD-04 | Bandit no bloqueante | Medium | Constante |
| SEC-06 | CSRF latente para RM-03 | Low | → Medium si RM-03 se implementa sin SameSite/CSRF token |
| SEC-07/TD-07 | `SECRET_KEY` sin uso | Low | N/A |
| SEC-08 | `_ensure_https` sin allowlist de dominio | Low | N/A |

---

# Recomendaciones

1. **SEC-03 es la acción más urgente si existe (o se planea) un despliegue en host con IP pública**: mover credenciales a `.env` no versionado y no publicar puertos de `postgres`/`valkey` al host.
2. **SEC-01 requiere una decisión de producto, no un parche**: documentar la restricción de "no exponer a redes no confiables" como mitigación inmediata; cualquier evolución a multi-usuario es un proyecto separado.
3. **SEC-04 y SEC-05** son mejoras de "higiene" de bajo riesgo y esfuerzo moderado — buenos candidatos para una sola PR de hardening.
4. **SEC-06** no requiere acción hoy — se incorpora como criterio de aceptación cuando se trabaje RM-03 (ver `docs/roadmap.md` §1).
5. Mantener la ejecución periódica de `bandit -r app/ -ll` (ya 0 hallazgos) y considerar subir el umbral a `-l` (low+) de forma informativa.

---

# Roadmap

| Fase | Alcance | Hallazgos | Esfuerzo |
|---|---|---|---|
| **Fase 1 — Hardening de configuración (compartida con TECHNICAL_AUDIT Fase 1/8)** | Credenciales a `.env`, no publicar puertos DB/Valkey, corregir comentario de `rate_limiter.py`, Bandit bloqueante en High | SEC-03, SEC-02, SEC-09 | S |
| **Fase 2 — Higiene de headers/dependencias** | `Permissions-Policy`, investigar nonces CSP, Dependabot | SEC-04, SEC-05 | S–M |
| **Fase 3 — Documentación de restricciones de exposición** | Sección "no exponer a Internet sin proxy autenticado" en `docs/architecture.md` | SEC-01 | XS |
| **Fase 4 — Criterios RM-03** | Incorporar SameSite/CSRF a la definición de RM-03 | SEC-06 | Incluido en RM-03 |
| **Fase 5 — Limpieza menor** | `SECRET_KEY`, allowlist `_ensure_https` (opcional) | SEC-07, SEC-08 | XS |

---

# Prioridades

| Prioridad | Hallazgos |
|---|---|
| **P0** | SEC-03 *(solo si existe despliegue con host expuesto — confirmar con el equipo)* |
| **P1** | SEC-01 (documentación) |
| **P2** | SEC-02, SEC-03 (si solo local), SEC-04, SEC-05, SEC-09 |
| **P3** | SEC-06, SEC-07, SEC-08 |

---

# Próximos Pasos

1. **[REQUIERE VALIDACIÓN con el equipo]**: confirmar si Music 4 All se despliega o se planea desplegar en un host con IP pública/red no confiable. Esta respuesta determina si SEC-01 y SEC-03 son P0 o P2.
2. Aplicar Fase 1 (credenciales a `.env`, no exponer puertos de `postgres`/`valkey`) como PR de hardening de bajo riesgo.
3. Habilitar Dependabot (SEC-05) — configuración declarativa, sin impacto en código.
4. Incorporar los criterios de SEC-06 a la definición de aceptación de RM-03 antes de iniciar su implementación.
5. Revisar este documento cuando se resuelva `ARCHITECTURE_AUDIT.md` AR-02 (estado en memoria), ya que está directamente ligado a SEC-01/SEC-02 en un escenario de escalado.
