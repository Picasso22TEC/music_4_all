# Legal (Fase 6 — hardening público)

> **Estos documentos son PLANTILLAS, no asesoría legal.** Antes de abrir la web al
> público, revísalos con un asesor legal y **rellena todos los `[placeholders]`**.

## Dónde vive el texto legal

Las páginas legales son públicas (fuera del grupo `(app)`, así que el middleware no
las gatea) y viven en el frontend:

| Ruta | Archivo | Contenido |
|---|---|---|
| `/legal` | `frontend/src/app/legal/page.tsx` | Índice |
| `/legal/terms` | `frontend/src/app/legal/terms/page.tsx` | Términos de Servicio |
| `/legal/copyright` | `frontend/src/app/legal/copyright/page.tsx` | Copyright + DMCA |
| `/legal/disclaimer` | `frontend/src/app/legal/disclaimer/page.tsx` | Disclaimer |

El shell común (banner de "plantilla", título, prosa) es
`frontend/src/app/legal/_components/LegalDocument.tsx`.

Puntos de entrada del usuario:
- **Login** (`features/auth/ui/LoginForm.tsx`): aviso "al conectar aceptas…" + enlaces.
- **Ajustes** (`app/(app)/settings/page.tsx`): tarjeta "Legal & about".

## Placeholders a rellenar antes de publicar

- `[OPERATOR NAME]` — quién opera el servicio (Términos).
- `[CONTACT EMAIL]` — contacto general (Términos).
- `[AGENT NAME]`, `[DMCA EMAIL]`, `[POSTAL ADDRESS]` — agente designado DMCA (Copyright).

Cada página muestra un banner amarillo recordando que es una plantilla; **quítalo**
(editando `LegalDocument`) cuando el texto esté revisado y aprobado.

## Divulgación del riesgo de revocación del `client_id`

El Disclaimer avisa de que el acceso "puede ser limitado, degradado, suspendido o
**revocado** en cualquier momento". Esto es intencional: el servicio usa un `client_id`
de Tidal compartido y de terceros cuyo baneo es un **riesgo real y no eliminable** del
plan (ver `docs/operations/ANTIABUSE.md` y la alerta `TidalClientIdPossiblyRevoked`).

## No afiliación / marca

Las tres páginas dejan claro que Music 4 All es una herramienta **no oficial** y **no
afiliada** a Tidal. "TIDAL" es marca de sus titulares; se usa solo para describir
interoperabilidad. Revisa este encuadre con tu asesor antes de publicar.
