# SLO / SLI / SLA — Music 4 All

> Define Indicadores de Nivel de Servicio (SLI) medibles con las métricas actualmente disponibles, propone Objetivos de Nivel de Servicio (SLO) realistas para el contexto del proyecto, y aclara el estado (inexistente/propuesto) de Acuerdos de Nivel de Servicio (SLA). Complementa [`MONITORING.md`](MONITORING.md) (de dónde provienen los datos) y [`QUALITY_GATES.md`](QUALITY_GATES.md) QG-24 (criterio de rollback derivado de SLOs).

---

# Executive Summary

Music 4 All es, según `SECURITY_AUDIT.md`, una **herramienta autohospedada de un solo usuario** — esto significa que **no existe ni se requiere un SLA contractual** (no hay clientes externos a quienes responder). Sin embargo, definir SLIs/SLOs internos sigue siendo valioso: dan un criterio objetivo para decidir si una degradación es "normal" o un incidente (alimentando `INCIDENT_RESPONSE.md`), y para decidir un rollback (`QUALITY_GATES.md` QG-24). Todos los SLOs aquí propuestos son **objetivos internos sugeridos**, no compromisos — y se marcan explícitamente como `[PROPUESTA]` cuando no hay forma de medirlos hoy. Ninguno de los SLOs propuestos tiene **datos históricos reales** que los respalden — todos requieren un período de medición de referencia antes de considerarse válidos (cross-ref `PERFORMANCE_AUDIT.md`: "No existen datos de carga real").

---

# Estado Actual

| Elemento | Estado |
|---|---|
| SLIs definidos formalmente | `[NO IMPLEMENTADO]` — se definen por primera vez en este documento |
| SLOs definidos formalmente | `[NO IMPLEMENTADO]` |
| SLA con terceros | `[INEXISTENTE]` — no aplica (autohospedado, un solo usuario) |
| Dashboards que respaldan medición de SLOs | Parcial — `music4all.json` (`MONITORING.md`) cubre latencia API y duración de descarga; faltan paneles de disponibilidad y éxito OAuth como % |
| Alertas basadas en SLO (error budget) | `[INEXISTENTE]` (depende de `MONITORING.md` MON-01) |

---

# SLIs (Service Level Indicators)

| SLI | Definición | Fuente de datos | Disponible hoy |
|---|---|---|---|
| **Disponibilidad API** | % de scrapes de `/health` (o `up{job="music4all-backend"}`) exitosos en una ventana de tiempo | Prometheus `up{job="music4all-backend"}` | ✅ Sí (con el scraping cada 10s ya configurado) |
| **Latencia API (p50/p95)** | Distribución de `http_request_duration_seconds` | `http_request_duration_seconds_bucket` (instrumentator) | ✅ Sí — ya en el dashboard `music4all.json` (panel 5) |
| **Latencia WebSocket (conexión)** | Tiempo desde `CONNECT` hasta primer mensaje (`job_started`/`progress`) | `[INEXISTENTE]` — no instrumentado | ❌ No (ver `MONITORING.md` MON-06) |
| **Tiempo de descarga** | Distribución de `music4all_download_duration_seconds` | `music4all_download_duration_seconds` | ✅ Sí — ya en el dashboard (panel 6), buckets [15,30,60,120,300,600,1800,inf] |
| **Tasa de éxito de descargas** | `downloads_total{status="completed"} / (completed + failed)` | `music4all_downloads_total{status}` | ✅ Sí |
| **Tasa de éxito de login OAuth** | `auth_logins_total{status="success"} / (success + failure)` | `music4all_auth_logins_total{status}` | ✅ Sí |
| **Profundidad de cola** | `music4all_queue_depth` en un momento dado | `music4all_queue_depth` | ✅ Sí |

---

# SLOs (Service Level Objectives) — `[PROPUESTA]`

> Todos los valores son puntos de partida razonables para un servicio autohospedado de un solo usuario, **no** basados en datos históricos (que no existen). Deben revisarse tras un período de observación de al menos 2-4 semanas con tráfico real.

| SLI | SLO propuesto | Ventana | Justificación |
|---|---|---|---|
| Disponibilidad API | ≥ 99% | 30 días | Equivale a ~7.2h de downtime/mes — generoso para un servicio sin redundancia (AR-02: instancia única) |
| Latencia API p95 | < 500ms | 7 días | Basado en que la mayoría de endpoints son CRUD simples sobre Postgres/Redis; búsquedas a Tidal pueden ser más lentas (excluir de este SLO o medir aparte) |
| Tiempo de descarga (track individual, calidad LOSSLESS) | p95 < 120s | 7 días | Basado en los buckets ya definidos en `music4all_download_duration_seconds` (incluye 120s como bucket) — `[Estimación]`, sin datos reales |
| Tasa de éxito de descargas | ≥ 95% | 7 días | Tolera fallos esperados (recursos no disponibles en la región/cuenta de Tidal) sin enmascarar fallos sistémicos |
| Tasa de éxito de login OAuth | ≥ 98% | 30 días | Fallos esperados solo por error de usuario (denegar autorización) o expiración del `device_code` |

---

# SLAs (Service Level Agreements)

**Estado: `[INEXISTENTE]` — no aplica.**

Music 4 All no tiene usuarios externos, clientes contractuales, ni compromisos de disponibilidad publicados. Si en el futuro el proyecto evoluciona hacia un servicio multi-usuario u ofrecido a terceros (lo cual requeriría primero resolver `ARCHITECTURE_AUDIT.md` AR-02 — estado en memoria que rompe con >1 réplica, y `SECURITY_AUDIT.md` SEC-01 — aislamiento de sesión por usuario), este documento debería actualizarse para incluir:
- SLA de disponibilidad publicado (ej. 99.5%).
- Definición de "downtime" a efectos contractuales.
- Proceso de crédito/compensación ante incumplimiento.

Por ahora, se recomienda tratar los SLOs de la sección anterior como el **único** compromiso (interno, informal) del proyecto.

---

# Hallazgos

| ID | Hallazgo | Severidad | Recomendación | Esfuerzo | Prioridad |
|---|---|---|---|---|---|
| SLO-01 | Ningún SLO tiene datos históricos que lo validen — todos son `[Estimación]` | Medium | Recolectar 2-4 semanas de métricas reales antes de tratar estos SLOs como referencia para alertas/rollback | — (tiempo, no esfuerzo de implementación) | P2 |
| SLO-02 | Latencia de WebSocket no instrumentada — no se puede medir el SLI correspondiente | Medium | Cross-ref `MONITORING.md` MON-06 | S | P2 |
| SLO-03 | Sin panel de "disponibilidad %" en Grafana (solo latencia/duración) | Low | Añadir panel basado en `up{job="music4all-backend"}` al dashboard existente | XS | P3 |
| SLO-04 | Sin alertas de error budget (consumo acelerado del SLO) | Medium | Depende de `MONITORING.md` MON-01 (Alertmanager) | M | P2 (vía MON-01) |

---

# Riesgos

| ID | Riesgo | Severidad |
|---|---|---|
| SLO-01 | Usar SLOs sin validar como criterio de rollback (QG-24) podría generar rollbacks innecesarios (umbral demasiado estricto) o no detectar degradaciones reales (umbral demasiado laxo) | Medium |
| SLO-02 | Degradación de WS (ej. PERF-02, conexiones pubsub sin límite) no sería detectable vía SLO hasta que afecte latencia HTTP general | Medium |

---

# Recomendaciones

1. Tratar los SLOs de este documento como **borrador** — instrumentar primero (`MONITORING.md` Fase 1-2), recolectar datos reales, y solo entonces ajustar los valores numéricos.
2. **SLO-03** es trivial y debería añadirse junto con cualquier otro cambio al dashboard `music4all.json` (coordinar con `MONITORING.md` MON-05).
3. Priorizar **SLO-02** si se decide instrumentar WS (MON-06) — sin él, el SLO de "latencia WS" queda permanentemente como `[NO VERIFICABLE]`.
4. No usar estos SLOs para definir QG-24 (`QUALITY_GATES.md`, criterio de rollback) hasta completar SLO-01 (período de observación).

---

# Roadmap

| Fase | Alcance | Hallazgos |
|---|---|---|
| **Fase 1** | Añadir panel de disponibilidad (SLO-03) | SLO-03 |
| **Fase 2** | Período de observación de 2-4 semanas para validar SLOs propuestos | SLO-01 |
| **Fase 3** | Instrumentar latencia WS (coordinado con MON-06) | SLO-02 |
| **Fase 4** | Definir alertas de error budget (coordinado con MON-01) | SLO-04 |
| **Fase 5** | Ajustar valores de SLO con datos reales; usarlos para QG-24 | SLO-01 |

---

# Prioridades

| Prioridad | Hallazgos |
|---|---|
| **P2** | SLO-01, SLO-02, SLO-04 |
| **P3** | SLO-03 |

---

# Próximos Pasos

1. Añadir el panel de disponibilidad (SLO-03) en la próxima iteración del dashboard de Grafana.
2. Iniciar el período de observación de 2-4 semanas (SLO-01) en cuanto el sistema tenga uso regular — no requiere trabajo de implementación, solo tiempo y los dashboards ya existentes.
3. Revisar este documento una vez completado MONITORING.md Fase 2-3 (Alertmanager, exporters) para definir SLO-04.
4. Una vez SLO-01 tenga datos, usar los valores ajustados para completar `QUALITY_GATES.md` QG-24.
