# Incident Response — Music 4 All

> Clasificación de severidad, proceso general de respuesta (detección/triage/mitigación/resolución/postmortem) y árboles de decisión para los incidentes más probables dado el estado actual del sistema. Complementa [`RUNBOOK.md`](RUNBOOK.md) (comandos operativos) y [`MONITORING.md`](MONITORING.md) (qué señales existen para detectar cada incidente).

---

# Executive Summary

Music 4 All es, según `SECURITY_AUDIT.md`, una **herramienta autohospedada de un solo usuario** — esto determina el alcance de este documento: no hay guardias de turno (on-call) formales, SLAs contractuales con terceros, ni un equipo de respuesta dedicado. Sin embargo, se define un proceso estructurado de respuesta a incidentes porque (a) el roadmap del proyecto apunta a profesionalización operativa, y (b) un proceso documentado reduce el tiempo de diagnóstico incluso para un operador único. **No existe hoy ningún sistema de alertas activo** (`MONITORING.md`) — la detección de incidentes es actualmente **reactiva** (el usuario nota que algo no funciona) en lugar de proactiva. Este es el hallazgo más importante de este documento (IR-01).

---

# Estado Actual

| Elemento del proceso de incidentes | Estado |
|---|---|
| Clasificación de severidad (P1-P4) | `[NO IMPLEMENTADO]` formalmente — definida en este documento por primera vez |
| Alertas automáticas (Prometheus Alertmanager, etc.) | `[INEXISTENTE]` (ver `MONITORING.md`) |
| Canal de notificación de incidentes | `[NO VERIFICABLE]` — sin guardia/on-call formal dado el contexto de un solo usuario |
| Runbooks de mitigación por componente | Parcial — cubiertos en `RUNBOOK.md` para operación normal; este documento añade árboles de decisión específicos de incidentes |
| Proceso de postmortem | `[NO IMPLEMENTADO]` — se define una plantilla mínima en este documento |
| Healthchecks que permitirían detección automática | Solo `postgres`/`valkey` (ver `RUNBOOK.md` RB-03) |

---

# Clasificación de Severidad

| Severidad | Definición | Ejemplo en Music 4 All | Tiempo de respuesta objetivo |
|---|---|---|---|
| **P1 — Crítico** | Sistema completamente inutilizable; pérdida de datos en curso o inminente | `postgres` caído (pérdida de historial), `backend` caído (toda la app inoperante) | Inmediato |
| **P2 — Alto** | Funcionalidad principal (descargas) no disponible o degradada severamente, pero el sistema responde | Worker no procesa la cola (`valkey` caído), OAuth roto (nadie puede iniciar sesión) | < 1 hora |
| **P3 — Medio** | Funcionalidad secundaria afectada; existe workaround | WebSocket de progreso roto pero las descargas completan (verificable vía `/history`), `/library`/`/settings` con error (ya son placeholders, bajo impacto) | < 24 horas |
| **P4 — Bajo** | Degradación cosmética o de observabilidad; sin impacto funcional directo | Grafana/Loki caídos (sin impacto en la app, solo en visibilidad), un panel del dashboard sin datos | Mejor esfuerzo |

---

# Proceso General

1. **Detección**: vía verificación manual (`RUNBOOK.md` §3), error reportado por el usuario, o (futuro) alerta de Prometheus.
2. **Triage**: clasificar severidad (tabla anterior) y determinar el componente afectado usando el árbol de decisión correspondiente (sección siguiente).
3. **Mitigación**: acción mínima para restaurar servicio (a menudo: reinicio del servicio afectado, ver `RUNBOOK.md` §6).
4. **Resolución**: causa raíz identificada y corregida (puede requerir cambio de código, configuración, o escalación a `DISASTER_RECOVERY.md` si hay pérdida de datos).
5. **Postmortem**: para P1/P2, documentar usando la plantilla de la sección "Postmortem" — alimenta `docs/roadmap.md` (deuda técnica) si la causa raíz es estructural.

---

# Árboles de Decisión

## 1. Backend caído (P1)

```
¿GET /health responde?
├── NO → ¿docker compose ps muestra "backend" como Exited/Restarting?
│         ├── SÍ → Revisar logs: docker compose logs --tail=200 backend
│         │         ├── Error de conexión a Postgres/Valkey → ir a árbol "PostgreSQL caído" / "Valkey caído"
│         │         ├── Error de import/excepción en startup → revisar último cambio de código (git log)
│         │         │         → docker compose restart backend; si persiste, rollback al build anterior (QG-22, [NO IMPLEMENTADO])
│         │         └── OOM / crash sin mensaje claro → revisar límites de recursos (PERF-03, sin deploy.resources)
│         └── NO (container "Up" pero /health no responde) → posible deadlock/hang
│                   → docker compose restart backend
│                   → Si recurrente, capturar logs antes de reiniciar para diagnóstico
└── SÍ pero responde lento/errores 5xx en otros endpoints
          → Revisar /metrics: ¿downloads_in_progress saturado? ¿queue_depth creciendo sin procesar?
          → Revisar logs por excepciones específicas del endpoint afectado
```

**Mitigación inmediata**: `docker compose restart backend`. Tras reiniciar, `reconcile_stale_jobs` marca como `failed` cualquier job que quedó `downloading` — verificar en `/history`.

## 2. Frontend caído (P1-P2 según disponibilidad de API directa)

```
¿curl -I http://localhost:3000 responde 200?
├── NO → docker compose logs --tail=200 frontend
│         ├── Error de build (si se reconstruyó) → docker compose up --build frontend
│         └── Proceso Next.js crasheado → docker compose restart frontend
└── SÍ pero la UI no carga datos (errores en consola del navegador)
          → Verificar que /api/* (rewrite de next.config.mjs) llega al backend:
            curl http://localhost/api/health (vía nginx) o backend directo
          → Si CORS error en consola → revisar CORS_ORIGINS (SEC config) vs origen real
```

**Nota**: como `/health` del backend sigue respondiendo independientemente del frontend, un frontend caído con backend sano es **P2** (la API sigue operativa para clientes directos), pero **P1** desde la perspectiva del único usuario (su única interfaz es la web).

## 3. PostgreSQL caído (P1)

```
¿docker compose ps muestra "postgres" healthy?
├── NO → docker compose logs --tail=200 postgres
│         ├── Volumen postgres_data corrupto/permisos → revisar mensaje de error específico
│         │         → Si corrupción confirmada → escalar a DISASTER_RECOVERY.md (pérdida de historial)
│         └── Puerto 5432 en conflicto con otro proceso del host → liberar puerto o cambiar mapeo
└── SÍ pero backend reporta errores de conexión
          → Verificar DATABASE_URL del backend coincide con credenciales de postgres
          → docker compose restart backend (reintenta conexión)
```

**Impacto mientras está caído**: `/history` y `/history/stats` fallarán; `GET /health` del backend **no** lo refleja (RB-01) — las descargas en curso pueden seguir funcionando (el estado de jobs vive en Redis/Valkey, no en Postgres) hasta que un track complete y se intente registrar en `AuditLog`/`DownloadRecord`.

**Mitigación inmediata**: `docker compose restart postgres`. Si el volumen está corrupto, ver `DISASTER_RECOVERY.md` (sin backup automatizado hoy — RB-05).

## 4. Valkey caído (P2, escala a P1 si persiste)

```
¿docker compose exec valkey valkey-cli ping responde PONG?
├── NO → docker compose logs --tail=200 valkey
│         → docker compose restart valkey
│         → Tras reiniciar, Valkey recupera estado desde AOF (--appendonly yes) si el volumen valkey_data está intacto
└── SÍ pero backend reporta errores de sesión/cola
          → Verificar REDIS_URL del backend
          → docker compose restart backend
```

**Impacto mientras está caído**:
- Sesiones OAuth (`music4all:session`) inaccesibles → usuarios no pueden autenticarse ni mantener sesión existente.
- Cola de descargas (`music4all:queue:downloads`) inaccesible → worker no puede tomar nuevos jobs (`BRPOP` falla).
- Estado de jobs en curso (`music4all:job:{job_id}`, TTL 24h) y pub/sub de progreso (`music4all:progress:all`) se pierden — jobs en curso al momento del fallo de Valkey probablemente queden en estado inconsistente.

**Severidad**: si Valkey está caído **menos de unos segundos** (restart rápido), probablemente P2 (degradación). Si está caído más tiempo o el `valkey_data`/AOF se pierde, escala a **P1** (sesiones y cola perdidas, requiere que el usuario re-autentique y re-encole descargas).

## 5. WebSocket roto (`/ws/downloads`) (P3)

```
¿La conexión WS se establece (sin error 1008 inesperado)?
├── NO, cierra con 1008 inmediatamente → ¿el usuario tiene sesión válida?
│         ├── NO → comportamiento esperado (ver E2E_VALIDATION.md Escenario 5) — no es un incidente
│         └── SÍ pero cierra con 1008 → posible fallo en engine.check_auth() del backend
│                   → Revisar logs del backend en el momento de la conexión
│                   → Verificar GET /session/status manualmente
├── NO, falla a nivel de red/nginx → curl -I --include vía nginx a /ws/ (verificar headers Upgrade/Connection)
│         → Revisar infrastructure/nginx/conf.d/music4all.conf (proxy_read_timeout 3600s, Upgrade/Connection headers)
└── SÍ se conecta pero no llegan mensajes "progress" durante una descarga activa
          → Verificar en Valkey: PUBSUB CHANNELS debe incluir music4all:progress:all
          → Revisar logs del worker: ¿está publicando progreso? (core/worker.py)
          → Conocido: 1 test (test_ws_downloads.py) falla por race condition en limpieza de suscripción
            (TD-03 / E2E-05) — si el síntoma coincide, no es un incidente nuevo, es deuda técnica conocida
```

**Impacto**: las descargas **continúan procesándose** (el worker no depende del WS) — solo se pierde la visibilidad de progreso en tiempo real. Verificable vía `/history` al completar. Por eso P3, no P1/P2.

## 6. OAuth roto (Device Flow) (P2)

```
¿POST /session/device-auth devuelve device_code/user_code/verification_uri?
├── NO (error 5xx) → Revisar logs del backend
│         → ¿Valkey caído? (sesiones OAuth viven en Redis) → ir a árbol "Valkey caído"
│         → ¿Error de tidalapi (API de Tidal cambió/caída)? → revisar excepción específica en logs
└── SÍ, pero verification_uri_complete/verification_uri no tienen esquema https://
          → Bug de regresión en _ensure_https (session/service.py) — ver docs/troubleshooting.md #3
          → Verificar manualmente: GET /session/device-auth/{device_code} antes y después de autorizar
└── El usuario autoriza en Tidal pero el polling nunca detecta "authorized"
          → Verificar GET /session/device-auth/{device_code} manualmente con el device_code real
          → Revisar si pending_oauth_v2 (estado en memoria, app.state) se perdió por un restart del backend
            durante el flujo (AR-02 — estado en memoria no sobrevive reinicios)
```

**Impacto**: nadie puede iniciar sesión nueva; usuarios con sesión activa (`music4all:session` en Redis, TTL hasta 3600s) **no se ven afectados** hasta que expire. Por eso P2 y no P1, salvo que coincida con expiración masiva de sesiones.

## 7. Descargas fallando (P2-P3 según alcance)

```
¿El job queda en "failed" inmediatamente (antes de progreso)?
├── SÍ → ¿engine.check_auth() falla? → sesión Tidal expirada/inválida → re-autenticar (árbol OAuth)
│      → ¿Recurso no disponible en la región/cuenta de Tidal? → error esperado, no es incidente de sistema
└── El job avanza parcialmente y luego falla
          → Revisar logs del worker para el job_id específico (job_logger incluye job_id)
          → ¿Error de ffmpeg (_finalize_raw_to_flac / _extract_flac_from_mp4)? → verificar espacio en disco
            (download_folder) y que ffmpeg esté disponible en la imagen del backend
          → ¿Falla solo en HI_RES_LOSSLESS (re-encode CPU-intensivo)? → posible límite de recursos (PERF-03)

¿Todos los jobs nuevos quedan "queued" sin avanzar (queue_depth crece, downloads_in_progress=0)?
└── Worker no está consumiendo la cola
          → ¿Valkey caído? → ir a árbol "Valkey caído"
          → ¿Excepción no controlada mató el loop del worker? → revisar logs, reiniciar backend
          → Verificar music4all_downloads_concurrency_limit en /metrics (debe ser 3 por defecto)
```

**Severidad**: 1 job fallido aislado (recurso no disponible) → no es incidente, es comportamiento esperado. Todos los jobs fallando o la cola completamente detenida → **P2**.

---

# Postmortem (plantilla mínima para P1/P2)

```markdown
## Incidente: <título corto>
- **Severidad**: P1/P2
- **Fecha/hora detección**: 
- **Fecha/hora resolución**: 
- **Duración**: 
- **Componente(s) afectado(s)**: 
- **Detección**: ¿cómo se detectó? (manual/usuario/futura alerta)
- **Causa raíz**: 
- **Mitigación aplicada**: 
- **Resolución definitiva**: 
- **¿Se requiere DISASTER_RECOVERY?**: Sí/No
- **Acción de seguimiento (deuda técnica)**: referenciar docs/roadmap.md o crear hallazgo en TECHNICAL_AUDIT.md si es estructural
```

---

# Hallazgos

| ID | Hallazgo | Severidad | Recomendación | Esfuerzo | Prioridad |
|---|---|---|---|---|---|
| IR-01 | No existe detección proactiva de incidentes (sin alertas) — todo este proceso depende de detección manual/reactiva | High | Implementar alertas básicas en Prometheus (ver `MONITORING.md`) para los árboles 1, 3, 4 y 7 (los más críticos) | M | P1 |
| IR-02 | Sin canal/registro centralizado de incidentes pasados — no hay forma de identificar recurrencia | Medium | Mantener un archivo simple (`docs/operations/incidents/` o sección en `docs/roadmap.md`) con postmortems usando la plantilla anterior | XS | P3 |
| IR-03 | Árbol "Valkey caído" depende de AOF para no perder estado — sin verificación de que `--appendonly yes` esté realmente persistiendo correctamente | Medium | Validar manualmente: reiniciar `valkey` con jobs en cola y confirmar que `music4all:queue:downloads` sobrevive | S | P2 |
| IR-04 | Árbol "OAuth roto" depende de estado en memoria (`pending_oauth_v2`) que no sobrevive un restart de `backend` durante el flujo — un restart de backend en medio de un login causa fallo silencioso para ese usuario | Medium | Cross-ref `ARCHITECTURE_AUDIT.md` AR-02 — mover estado de Device Flow a Redis eliminaría esta clase de incidente | M | P2 |

---

# Riesgos

| ID | Riesgo | Severidad |
|---|---|---|
| IR-01 | Incidentes P1 (ej. `postgres`/`backend` caído) pueden no detectarse hasta que el usuario lo note, aumentando tiempo de inactividad | High |
| IR-03 | Si AOF de Valkey no persiste correctamente, cualquier incidente "Valkey caído" se convierte en pérdida de cola/sesiones (escalaría de P2 a P1) | Medium |
| IR-04 | Restart de backend durante login OAuth produce un fallo difícil de diagnosticar sin conocer AR-02 | Medium |

---

# Recomendaciones

1. **IR-01** es la prioridad — sin alertas, este documento es solo una guía reactiva. Implementar al menos alertas para: `backend` no responde a `/health`, `postgres`/`valkey` unhealthy, `queue_depth` creciente sin `downloads_in_progress` (worker detenido).
2. **IR-03** debe validarse antes de confiar en el árbol de decisión "Valkey caído" — si AOF no persiste, ese árbol necesita actualizarse para reflejar pérdida de datos como resultado esperado.
3. **IR-02** es de muy bajo esfuerzo y aporta valor compuesto con el tiempo — cada postmortem documentado acelera el triage de incidentes futuros similares.
4. **IR-04** se resuelve como efecto secundario de implementar AR-02 (`ARCHITECTURE_AUDIT.md`) — no requiere trabajo adicional dedicado, solo coordinación de prioridad.

---

# Roadmap

| Fase | Alcance | Hallazgos |
|---|---|---|
| **Fase 1** | Validar persistencia AOF de Valkey (IR-03) | IR-03 |
| **Fase 2** | Crear registro de incidentes/postmortems (IR-02) | IR-02 |
| **Fase 3** | Implementar alertas básicas en Prometheus (coordinado con `MONITORING.md`) | IR-01 |
| **Fase 4** | Resolver AR-02 (estado de OAuth en Redis) — elimina IR-04 | IR-04 |

---

# Prioridades

| Prioridad | Hallazgos |
|---|---|
| **P1** | IR-01 |
| **P2** | IR-03, IR-04 |
| **P3** | IR-02 |

---

# Próximos Pasos

1. Validar IR-03 (persistencia AOF de Valkey) — bajo esfuerzo, alto valor para confiar en el árbol de decisión #4.
2. Crear el registro de incidentes (IR-02) antes del próximo incidente real, para empezar a acumular historial.
3. Definir las alertas de Prometheus de Fase 3 en conjunto con `MONITORING.md` (siguiente documento).
4. Priorizar AR-02 en el roadmap general considerando su impacto combinado en `ARCHITECTURE_AUDIT.md` y este documento (IR-04).
