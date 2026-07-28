# Anti-abuso y administración (Fase 6)

Cómo frenar el abuso en la web pública: cuotas, detección por strikes, ban de
usuarios, panel de administración y alertas. El riesgo transversal del plan (baneo del
`client_id` compartido de Tidal) es **real y no eliminable**; todo esto lo mitiga.

## 1. Administradores

Los endpoints `/admin/*` los protege `require_admin`: solo pasan los IDs de usuario
Tidal listados en la variable de entorno `ADMIN_TIDAL_USER_IDS`.

```bash
# .env del backend (formato JSON, igual que CORS_ORIGINS)
ADMIN_TIDAL_USER_IDS='["197033432"]'
```

Con la lista vacía (por defecto) **nadie es admin** y todo `/admin/*` responde 403.

## 2. Ban de usuarios

Un ban vive en Redis (`music4all:banned:{uid}`) y bloquea al usuario en tres puntos:
el gate de `get_current_user` (403 `ACCOUNT_BANNED` en todo endpoint autenticado), el
login (no emite cookie ni tokens) y el WebSocket (`/ws/downloads`, cierre 1008). Al
banear se **revocan todas las sesiones** del usuario (queda fuera al instante).

```bash
# Banear (permanente)
curl -X POST http://localhost:8000/admin/bans \
  -H "Content-Type: application/json" -b m4a_sid=<sid-admin> \
  -d '{"tidal_user_id":"123","reason":"abuso"}'

# Banear 24 h (temporal, se auto-levanta)
curl -X POST http://localhost:8000/admin/bans \
  -H "Content-Type: application/json" -b m4a_sid=<sid-admin> \
  -d '{"tidal_user_id":"123","reason":"spam","ttl_seconds":86400}'

# Listar bans
curl http://localhost:8000/admin/bans -b m4a_sid=<sid-admin>

# Desbanear (limpia también los strikes)
curl -X DELETE http://localhost:8000/admin/bans/123 -b m4a_sid=<sid-admin>

# Resumen anti-abuso de un usuario (sesiones, cuota, strikes) para decidir un ban
curl http://localhost:8000/admin/users/123 -b m4a_sid=<sid-admin>
```

No se puede banear a un administrador (el servicio lo rechaza con 403).

> **Límite conocido:** el ban frena descargas y logins **nuevos**; los jobs ya en
> curso del usuario terminan (el worker no revalida el ban por track). Para cortarlos
> al instante, cancelar sus jobs desde la operación normal.

## 3. Detección de abuso por strikes (sin auto-ban)

Cada vez que un usuario topa una cuota (`quotas.assert_within_quota`) o es limitado por
rate-limit se registra un **strike** en una ventana deslizante. Al alcanzar el umbral
se emite **una** alerta (log + métrica), deduplicada por ventana. **No hay auto-ban**:
la alerta es para revisar y, si procede, banear a mano.

```bash
# .env del backend (0 en el umbral = desactiva las alertas; se siguen contando)
ABUSE_STRIKE_WINDOW=3600            # ventana deslizante (s)
ABUSE_STRIKE_ALERT_THRESHOLD=20     # strikes en la ventana que disparan la alerta
```

## 4. Cuotas

Ya existentes (Fase 3), son la primera barrera anti-abuso. `0`/negativo = sin límite.

```bash
MAX_DOWNLOADS_PER_DAY=50            # cuota diaria (día UTC)
MAX_CONCURRENT_JOBS_PER_USER=3     # jobs no terminales simultáneos
```

## 5. Alertas Prometheus

Las reglas están en `infrastructure/prometheus/alerts.yml` (ya montado en el contenedor
de Prometheus vía `docker-compose.yml`). **Para activarlas, declara el archivo en
`infrastructure/prometheus/prometheus.yml`:**

```yaml
rule_files:
  - /etc/prometheus/alerts.yml
```

Reglas incluidas:

| Alerta | Severidad | Señal |
|---|---|---|
| `TidalClientIdPossiblyRevoked` | critical | 401 de Tidal sostenidos → posible revocación del `client_id` compartido |
| `TidalRateLimitSpike` | warning | 429 de Tidal frecuentes (el circuit breaker se abre) |
| `AbuseAlertFiring` | warning | Un usuario superó el umbral de strikes (revisar para ban manual) |
| `QuotaRejectionSpike` | warning | Muchos rechazos de cuota (abuso o límites mal dimensionados) |

Umbrales orientativos: ajústalos con tráfico real. Sin Alertmanager, se ven igual en la
UI de Prometheus (Status → Rules/Alerts) y en Grafana.

## 6. Métricas (backend `/metrics`)

- `music4all_bans_total{action}` — ban / unban aplicados.
- `music4all_abuse_strikes_total{kind}` — strikes por motivo (quota_daily | quota_concurrent | rate_limit).
- `music4all_abuse_alerts_total` — alertas de abuso emitidas.
- `music4all_quota_rejections_total{quota}` — rechazos de cuota (Fase 3).
- `music4all_tidal_api_errors_total{kind}` — 401 (`auth`) / 429 (`rate_limited`) de Tidal (Fase 4).
