# Fase 7 — De-mock y confianza de producción

> Estado: **PROPUESTA** (auditoría hecha 2026-07-28; pendiente de ejecutar en una rama
> `feat/production-readiness`). Objetivo: que ningún camino de producción dependa de
> mocks/stubs, defaults de desarrollo, o funcionalidad a medias, de modo que el
> producto sea confiable al abrirse al público.

## Resumen de la auditoría

Buena noticia: el código de producción está **casi libre de mocks**. Se auditó todo
`backend/app/` y `frontend/src/` (excluyendo tests):

- **Backend `app/`**: 0 usos de `Mock`/`MagicMock`/`AsyncMock` fuera de tests. El único
  stub real es `core/security.py` (código muerto, ver A1).
- **Frontend `src/`**: los `Math.random()` de producción son features reales (shuffle de
  cola/artista/álbum) o decoración; los `placeholder=` son atributos de inputs; los
  elementos "decorativos" (tocadiscos, cassettes, partículas) son diseño intencional.
- `library` y el player, que la memoria daba por "placeholder/decorativo", hoy son
  **reales** (`useHistoryQuery` + un `<audio>` conectado al store).

Lo que sí compromete la confianza en producción son **defaults de desarrollo enviados
como si fueran de producción**, **features a medias** y **gates de calidad no forzados**.
Se listan abajo, priorizados.

---

## A. Mocks / stubs / código muerto (la preocupación directa)

### A1. `backend/app/core/security.py` — stubs muertos que aparentan seguridad
`verify_token()` devuelve `False` y `create_access_token()` devuelve `""`, ambos con
`# placeholder — not yet implemented`. **No los importa nadie** (la auth real vive en
`user_session.py` / `dependencies.py` / `oauth_helper.py`). Un archivo llamado
"security" con funciones vacías es exactamente lo que erosiona la confianza.
- **Acción:** eliminar el módulo (dead code). Verificar que no rompe imports.

---

## B. Defaults de desarrollo peligrosos en producción

### B1. `config.py` — secretos/cookies inseguros por defecto
`cookie_secure=False`, `session_encryption_key=""` (usa clave **efímera** → los tokens
cifrados no sobreviven a un reinicio), `cors_origins=[localhost, frontend]`. En un
despliegue público real, arrancar así es inseguro y frágil.
- **Acción:** guard de arranque que **falle rápido** en producción si falta
  `SESSION_ENCRYPTION_KEY`, si `cookie_secure` no es `True`, o si CORS sigue en
  localhost. Alternativa mínima: `.env.production` documentado + verificación al boot.

### B2. `.env.example` — `SESSION_ENCRYPTION_KEY=` vacío
El ejemplo ships con la clave vacía (línea 15). Sumado a B1, invita a desplegar sin
cifrado persistente.
- **Acción:** documentar como **obligatoria** y que el guard de B1 la exija.

### B3. `docker-compose.yml` — Grafana `admin/admin`
`GF_SECURITY_ADMIN_USER=admin` / `GF_SECURITY_ADMIN_PASSWORD=admin` (líneas 147-148).
- **Acción:** credenciales por variable de entorno, sin default trivial.

### B4. `.env.example` — `SECRET_KEY=change-me-in-production` (roadmap 2.7)
- **Acción:** confirmar si `SECRET_KEY` se usa en el código; si no, eliminarlo; si sí,
  exigir override.

---

## C. Correctitud / consistencia que resta confianza

### C1. `core/tidal.py:808` — calidad literal `"EXISTE"` en el historial
Cuando el archivo ya está en disco, la descarga devuelve el string `"EXISTE"` como
calidad y el worker lo guarda tal cual (ya hay ~47 filas reales así). El historial
muestra "EXISTE" como si fuera un formato de audio.
- **Acción:** ese camino ya llama a `_read_audio_info` (tiene sample_rate y bits) →
  construir la etiqueta real igual que en el camino normal. Decidir aparte el backfill
  de las filas ya escritas.

### C2. Mezcla de idiomas en mensajes de error
Los mensajes de `ApiException` del backend están en español y la UI (inglés) los pinta
**verbatim** (p.ej. `DownloadJobItem`, mensajes de cuota/ban). Un usuario final ve
español suelto en una app en inglés.
- **Acción:** estandarizar a inglés en el backend, o mapear por `code` en el frontend
  (el `code` ya viaja en el error).

---

## D. Supuestos de una sola réplica que rompen en silencio al escalar

### D1. `backend/Dockerfile:37` — `--workers 2` contradice el estado en memoria
`JobControlRegistry` y `pending_oauth*` son **in-memory por proceso**; con 2 workers,
pausar/cancelar un job solo funciona si la petición cae en el worker que lo ejecuta.
- **Acción:** `--workers 1` hasta externalizar el estado (fase Multi-réplica, AR-02), o
  externalizarlo a Redis.

### D2. `rate_limiter.py` — slowapi con `MemoryStorage`
Los contadores se reinician al reiniciar y no se comparten entre réplicas.
- **Acción:** storage en Redis cuando haya multi-réplica (ojo: el storage se construye
  al importar → no atar tests/CI a un Redis vivo).

---

## E. Features a medias (backend listo, sin UI)

### E1. Panel de sesiones sin frontend
Los endpoints `/session/sessions` (listar/revocar/revocar-otras) existen desde la Fase 1;
**no hay UI** en el frontend. Una función de seguridad anunciada pero inalcanzable.
- **Acción:** UI de "dispositivos/sesiones activas" en Ajustes (cerrar sesión remota).

---

## F. Gates de calidad no forzados

### F1. CI no bloquea ante fallos de pytest
`.github/workflows/ci.yml:197`: `uv run pytest tests/ -v ... || echo "No tests found — skipping"`
→ un fallo de tests **no impide el merge**. La suite está verde (340/2 skip), así que es
seguro activar el bloqueo.
- **Acción:** quitar el `|| echo ...`; considerar añadir `mypy` (49 errores hoy, no gatea)
  al menos en modo informativo.

---

## G. Deriva de documentación (también resta confianza)

### G1. `docs/roadmap.md` desactualizado (fechado 2026-07-04)
Su sección 1 lista `/library`, `/settings` y `middleware.ts` como "placeholders /
`return null` / no implementado". Los tres están **implementados y en uso** hoy
(library con `useHistoryQuery`, settings completo, middleware con protección real por
cookie httpOnly). Documentación que miente sobre el estado del producto.
- **Acción:** refrescar el roadmap (o marcarlo como histórico y apuntar a este doc).

---

## Priorización sugerida

| Prioridad | Ítems | Criterio |
|---|---|---|
| **P0 — antes de abrir al público** | A1, B1, B2, B3, D1, F1, C1 | Seguridad, integridad de datos y "aparenta seguro pero no lo es" |
| **P1 — pulido de confianza** | E1, C2, B4, G1 | Feature a medias, consistencia visible al usuario |
| **P2 — escalar** | D2 + externalizar estado (AR-02) | Solo relevante con multi-réplica |

## Notas
- Ninguno de estos toca el núcleo de descarga (contrato estable, AR-03).
- Ejecutar en rama `feat/production-readiness`; `ruff`/tests verdes por commit, como el
  resto de fases.
- Relacionado: `docs/roadmap.md` (deuda 2.x), `docs/operations/ANTIABUSE.md` (Fase 6),
  `docs/audits/*` (auditorías históricas).
