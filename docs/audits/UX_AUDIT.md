# UX Audit — Music 4 All

> 🕒 **Estado de vigencia — revisado 2026-07-02.** Documento puntual (~jun-2026) **parcialmente desfasado**; verificar contra el código actual antes de accionar. Señal automatizada al 2026-07-02 en verde (frontend `lint`/`build` + **87 tests Vitest**).
> - ✅ **Ya resuelto (NO accionar):** **UX-01** — `/downloads` existe como página completa (`app/(app)/downloads/page.tsx`); **UX-02** — `/library` y `/settings` implementadas (`settings` funcional); **UX-04** — `prefers-reduced-motion` implementado (`shared/hooks/useReducedMotion.ts` + `globals.css`); **UX-07** — `ToastProvider` montado en `providers/Providers.tsx`; **UX-10** — código muerto eliminado, `NeonTitle`/`NeonParticles` viven ahora en `shared/ui/` y **están en uso**. La premisa repetida de "no hay test runner de frontend" es **falsa** (Vitest configurado).
> - ⚠️ **Sigue vigente:** **UX-03** — sin navegación móvil (`Sidebar` es `hidden lg:flex`, drawer no implementado en `useSidebarState`); **UX-06** — `<h1>` duplicado, **ahora expandido** a las 4 páginas autenticadas (AppHeader + cada página); **UX-05** — `PlayerBar` etiquetado "Próximamente" pero sin reproducción real; **UX-07** (matiz) — Toast montado pero `useToast()` no se invoca desde ninguna mutación.

> Auditoría del estado **actual** del frontend (Next.js 14, FSD) frente a la experiencia esperada de un producto listo para usuarios reales, y frente a la visión documentada en [`docs/frontend/FRONTEND_VISION.md`](../frontend/FRONTEND_VISION.md) y [`docs/frontend/DESIGN_SYSTEM_VISION.md`](../frontend/DESIGN_SYSTEM_VISION.md). Cubre: Login, Dashboard, Descargas, Historial, Navegación, Accesibilidad, Responsive, estados vacíos/error/carga, y feedback visual. Complementa [`TECHNICAL_AUDIT.md`](TECHNICAL_AUDIT.md) (TD-10, TD-12, TD-13).

---

# Executive Summary

La base de accesibilidad del frontend es **sólida**: skip-link, `aria-live`, `role="alert"`/`role="status"`, `focus-visible`, `aria-current` en navegación, y patrones consistentes de skeleton/empty-state/error-state están implementados en los flujos que sí existen (Login, Dashboard/búsqueda, Historial). Sin embargo, se identificaron **tres hallazgos Critical** que afectan directamente la percepción de calidad del producto:

1. **La navegación principal (Sidebar + AppHeader) promete 3 de 5 destinos que no existen o están vacíos**: `/library` y `/settings` son `return null`; `/downloads` **ni siquiera existe como ruta** (solo el widget overlay `DownloadPanel` cubre esa funcionalidad).
2. **No hay navegación móvil**: el `Sidebar` está `hidden` por debajo de `lg` (1024px) sin ninguna alternativa (hamburguesa, bottom-nav) — por debajo de ese ancho, el usuario **no puede navegar** entre secciones.
3. **`prefers-reduced-motion` no existe en código**, pese a que `FRONTEND_VISION.md` lo asume como prerrequisito ya resuelto para las animaciones del rediseño neón.

Adicionalmente, `PlayerBar` es **puramente decorativo** (sin elemento `<audio>`, sin controles funcionales) — visualmente sugiere una capacidad de reproducción que el producto no ofrece.

**Ningún hallazgo de este audit requiere reescribir el diseño visual** — son gaps de **completitud funcional y responsive**, ortogonales (y en algunos casos prerrequisito) al trabajo de `IMPLEMENTATION_PLAN.md`.

---

# Estado Actual

## Mapa de rutas

| Ruta | Estado | Evidencia |
|---|---|---|
| `/login` (auth) | ✅ Completo — `LoginForm` con máquina de estados OAuth Device Flow | `frontend/src/app/(auth)/login/page.tsx` |
| `/dashboard` | ✅ Completo — búsqueda, resultados, descarga | `frontend/src/app/(app)/dashboard/page.tsx` + `DashboardClient.tsx` |
| `/history` | ✅ Completo — loading/error/empty/success | `frontend/src/app/(app)/history/page.tsx` |
| `/library` | ❌ `return null` (placeholder Phase 3+) | `frontend/src/app/(app)/library/page.tsx` |
| `/settings` | ❌ `return null` (placeholder Phase 3+) | `frontend/src/app/(app)/settings/page.tsx` |
| `/downloads` | ❌ **No existe** — sin `page.tsx` bajo `(app)/downloads/` | research UX punto 1 |

## Componentes transversales

| Componente | Estado funcional | Estado responsive |
|---|---|---|
| `Sidebar` | ✅ Navegación activa con `aria-current` | ❌ `hidden lg:flex` — invisible <1024px, sin alternativa |
| `AppHeader` | ✅ Título dinámico por ruta | ⚠️ Sin prefijos responsive, fijo |
| `DownloadPanel` | ✅ WS singleton, estados de progreso | ⚠️ Sin prefijos responsive (no verificado a fondo) |
| `PlayerBar` | ❌ Decorativo, sin `<audio>` ni controles | ⚠️ Oculta progreso (`md:`) y volumen (`lg:`), barra base siempre visible |
| Toast/Notificaciones | ⚠️ Componente existe (`shared/ui/Toast/`), uso real no confirmado | — |

---

# Hallazgos

## UX-01 — `/downloads` no existe como ruta pese a estar en la navegación

- **Descripción**: ni `Sidebar.NAV_ITEMS` ni `AppHeader.PAGE_TITLES` distinguen entre rutas reales y placeholders — ambos incluyen una entrada para `/downloads`, pero no existe ningún `page.tsx` bajo `frontend/src/app/(app)/downloads/`. La única superficie de descargas es el widget overlay `DownloadPanel`.
- **Evidencia**: research UX_AUDIT puntos 1 y 8.
- **Impacto técnico**: navegar a `/downloads` (vía click en Sidebar/AppHeader, o URL directa) probablemente produce el 404 genérico de Next.js (`frontend/src/app/(app)/error.tsx` existe pero es para errores de render, no 404 — **[REQUIERE VALIDACIÓN]** si hay `not-found.tsx` a nivel de `(app)` o raíz).
- **Impacto de negocio**: un click en "Downloads" desde la navegación principal —  una de las acciones más obvias para un usuario nuevo — lleva a una página de error. Esto es el hallazgo de mayor impacto directo en la primera impresión del producto.
- **Recomendación**: **opción de menor esfuerzo (recomendada a corto plazo)**: eliminar/ocultar la entrada "Downloads" de `Sidebar`/`AppHeader` (la funcionalidad ya es accesible vía `DownloadPanel`, siempre visible). **Opción de medio plazo**: crear `frontend/src/app/(app)/downloads/page.tsx` que reutilice `DownloadJobItem`/lógica de `DownloadPanel` en una vista de página completa (historial de jobs activos + completados, más espacio que el overlay).
- **Esfuerzo estimado**: XS (ocultar) / M (página completa).
- **Prioridad**: **P0** (ocultar) / P2 (página completa).
- **Severidad**: **Critical**.

## UX-02 — `/library` y `/settings`: placeholders accesibles desde navegación principal

- **Descripción**: ambas páginas son `return null` explícito ("Phase 3+ placeholder"), pero `Sidebar`/`AppHeader` las presentan como destinos de navegación normales, indistinguibles visualmente de `/dashboard` o `/history` antes de hacer click.
- **Evidencia**: research UX_AUDIT punto 1; `docs/roadmap.md` §1 (ya documentado, pero sin la severidad de "afecta navegación").
- **Impacto técnico**: `docs/e2e-validation.md` línea 23 documenta esto como comportamiento **esperado** ("render vacío es esperado, no debe haber error 500"). Es decir, técnicamente correcto, pero UX-mente incompleto.
- **Impacto de negocio**: un usuario que hace click en "Library" o "Settings" ve una pantalla en blanco sin ninguna indicación de "próximamente" — peor que no tener el enlace, porque sugiere que algo se rompió.
- **Recomendación**: opción de bajo esfuerzo: renderizar un estado "Próximamente" reutilizando el patrón `EmptyState`/`HistoryEmptyState` ya existente (icono + título + descripción breve), en lugar de `return null`. Esto convierte una posible percepción de "bug" en una comunicación deliberada de roadmap, sin requerir implementar la funcionalidad real.
- **Esfuerzo estimado**: XS (reutilizar `EmptyState` con copy "Próximamente").
- **Prioridad**: P1.
- **Severidad**: **High**.

## UX-03 — Sin navegación en viewports <1024px (sin shell móvil)

- **Descripción**: `Sidebar.tsx:61` usa `hidden lg:flex` — el sidebar completo desaparece por debajo de 1024px (`lg` en Tailwind). No se encontró ningún trigger de menú hamburguesa, drawer, ni navegación inferior (bottom-nav) en `widgets/` que sirva como alternativa.
- **Evidencia**: research UX_AUDIT punto 4.
- **Impacto técnico**: en tablets en orientación vertical y en todos los móviles, las 5 entradas de navegación (Dashboard, Library, Downloads, History, Settings) son completamente inalcanzables mediante UI — solo navegación por URL directa.
- **Impacto de negocio**: la app es **efectivamente no usable en móvil/tablet** más allá de la página inicial a la que se llega. Dado que `AppHeader`, `DownloadPanel` y `PlayerBar` sí permanecen visibles (con ajustes responsive parciales), el usuario ve un shell "casi funcional" pero sin forma de cambiar de sección.
- **Recomendación**: priorizar la implementación de un patrón de navegación móvil — opciones estándar: (a) botón de menú en `AppHeader` (visible `<lg`) que abre el `Sidebar` como drawer/overlay (reutilizando z-index `overlay`/`modal` ya definidos en `tailwind.config.ts`); (b) bottom-navigation bar con los 5 destinos (más idiomático en apps tipo "reproductor"). La opción (a) es menos invasiva y reutiliza el componente `Sidebar` existente con un wrapper de visibilidad condicional.
- **Esfuerzo estimado**: M (drawer reutilizando `Sidebar` + `Modal`/overlay existente).
- **Prioridad**: P1.
- **Severidad**: **Critical**.

## UX-04 — `prefers-reduced-motion` ausente (cross-reference)

- Ver [`TECHNICAL_AUDIT.md` TD-13](TECHNICAL_AUDIT.md#td-13--prefers-reduced-motion-ausente-pese-a-estar-asumido-en-documentación-de-diseño). Desde la perspectiva UX: usuarios con sensibilidad al movimiento/fotosensibilidad no tienen forma de reducir las animaciones actuales (`animate-pulse-neon`, `animate-shimmer`, `animate-progress-indeterminate`) ni las futuras del rediseño neón.
- **Severidad**: **Medium** (uso actual — animaciones de baja intensidad) / **High** (si se inicia el rediseño sin resolverlo, ya capturado como bloqueante en `IMPLEMENTATION_PLAN.md` Fase 0).

## UX-05 — `PlayerBar` decorativo sin reproducción real (cross-reference)

- Ver [`TECHNICAL_AUDIT.md` TD-12](TECHNICAL_AUDIT.md#td-12--playerbar-decorativo-sin-reproducción-real--hallazgo-nuevo). Desde la perspectiva UX: el `PlayerBar` muestra `currentTrack`, indicador `isPlaying`, barra de progreso y volumen — todos los signos visuales de un reproductor funcional — sin que exista interacción que los modifique. Un usuario que haga click en la zona del `PlayerBar` esperando controles de reproducción no encontrará ninguno.
- **Recomendación adicional (UX)**: si no se implementa reproducción real a corto plazo, considerar **ocultar `PlayerBar` por completo** en lugar de mostrarlo en estado "congelado" — un componente ausente comunica mejor "no implementado" que un componente que parece roto.
- **Severidad**: **High** (duplicado de TD-12).

## UX-06 — Heading hierarchy: `<h1>` duplicado en `/history`

- **Descripción**: `AppHeader.tsx:60` renderiza un `<h1>` dinámico con el título de la página ("Download History"), y `frontend/src/app/(app)/history/page.tsx:31` renderiza **otro** `<h1>` con el mismo texto dentro del contenido de la página.
- **Evidencia**: research UX_AUDIT punto 2.
- **Impacto técnico**: dos elementos `<h1>` en el DOM violan la convención de un único `<h1>` por página (no rompe funcionalidad, pero afecta la navegación por landmarks de lectores de pantalla y la semántica SEO).
- **Impacto de negocio**: bajo — efecto principal en usuarios de lectores de pantalla que navegan por encabezados.
- **Recomendación**: cambiar el `<h1>` de `history/page.tsx:31` a `<h2>` (el título de página ya lo provee `AppHeader` como `<h1>`). Verificar si el mismo patrón se repite en `/dashboard` (`DashboardClient.tsx`) — **[REQUIERE VALIDACIÓN]**, no confirmado en la investigación.
- **Esfuerzo estimado**: XS.
- **Prioridad**: P3.
- **Severidad**: **Low**.

## UX-07 — Sistema de Toast: existencia confirmada, uso real no verificado

- **Descripción**: `frontend/src/shared/ui/Toast/Toast.tsx` + `ToastProvider.tsx` implementan un sistema de notificaciones propio (no `sonner`/`react-hot-toast`, confirmado ausente de `package.json`), con `role="alert"`/`role="status"` y `aria-live` según variante, renderizado en portal. La investigación **no confirmó** si `ToastProvider` está montado en el layout raíz ni si las mutaciones (descargas, errores de red) lo invocan — solo se localizaron las definiciones del componente.
- **Evidencia**: research UX_AUDIT punto 6.
- **Impacto técnico**: si `ToastProvider` no está montado o no se invoca desde mutaciones de TanStack Query (`onError`/`onSuccess`), el sistema de feedback "global" del usuario depende exclusivamente de los estados `role="alert"` inline ya confirmados en `LoginForm`, `EmptyState` (variante error) e `history/page.tsx` — que cubren bien sus contextos locales, pero no eventos transversales (p. ej. "descarga completada" mientras el usuario está en `/dashboard`, no en el panel de descargas).
- **Impacto de negocio**: posible feedback perdido para eventos asíncronos (descarga completada/fallida) si el usuario no tiene el `DownloadPanel` expandido.
- **Recomendación**: **[REQUIERE VALIDACIÓN]** — confirmar (1) si `ToastProvider` está en `app/layout.tsx` o `(app)/layout.tsx`, y (2) qué mutaciones lo invocan. Si no está conectado, conectarlo a eventos clave: descarga completada/fallida (ya disponibles vía WS), error de red en mutaciones de TanStack Query.
- **Esfuerzo estimado**: XS (validación) / S (conectar si falta).
- **Prioridad**: P2.
- **Severidad**: **Medium**.

## UX-08 — `Popover.tsx`: único uso de `style={{}}` inline (verificación pendiente)

- **Descripción**: `frontend/src/shared/ui/Popover/Popover.tsx:220` es el único match de `style={{...}}` en `frontend/src/` — patrón consistente con la regla de diseño "no usar estilos inline para colores" (`DESIGN_SYSTEM_VISION.md`).
- **Evidencia**: research UX_AUDIT punto 10.
- **Impacto técnico**: ninguno si, como es lo más probable dado el patrón `Popover`, se trata de posicionamiento dinámico (`top`/`left`/`transform` calculado en runtime) y no de color — **[REQUIERE VALIDACIÓN]** rápida (1 línea).
- **Recomendación**: confirmar que la propiedad inline es de posicionamiento (no color); si es así, no requiere cambio — los estilos de posicionamiento dinámico son una excepción legítima a la regla "no inline para colores".
- **Esfuerzo estimado**: XS.
- **Prioridad**: P3.
- **Severidad**: **Informational**.

## UX-09 — Estados vacíos/error/carga: patrón consistente (hallazgo positivo)

- **Descripción**: `/history` (`HistoryEmptyState`), `/dashboard` búsqueda (`EmptyState` con variantes `initial`/`no-results`/`error`), y `DownloadPanel` ("No active downloads") siguen un patrón consistente de icono + título + descripción + `role="status"`/`role="alert"` + `aria-live`. Loading states usan `Skeleton` de forma consistente en `/history` y `/dashboard`.
- **Evidencia**: research UX_AUDIT puntos 5, 6, 7.
- **Impacto**: positivo — no requiere acción. Este patrón debe **reutilizarse** para UX-02 (placeholders "Próximamente" de `/library`/`/settings`) y para cualquier nueva página (`/downloads`, UX-01).
- **Severidad**: **Informational** (hallazgo positivo).

## UX-10 — Código muerto frontend con hex hardcodeados (cross-reference, sin impacto activo)

- **Descripción**: `frontend/src/components/NeonTitle.tsx` (`drop-shadow-[0_0_20px_#00ff00]`, `text-neon-green`) y `VinylCard.tsx` (`text-white`) violan la regla "no hex nuevos / usar tokens del design system" — pero ambos son código muerto confirmado (TECHNICAL_AUDIT TD-08), no importado por código FSD activo.
- **Evidencia**: research UX_AUDIT (verificación), research ARCHITECTURE_AUDIT punto 3.
- **Impacto**: ninguno mientras permanezca sin usar. Relevante únicamente si alguien "resucita" estos archivos como punto de partida para el rediseño neón (riesgo de reintroducir hex hardcodeados y violar `DESIGN_SYSTEM_VISION.md` §1).
- **Recomendación**: incluir en la limpieza de TD-08; mencionar explícitamente en `IMPLEMENTATION_PLAN.md` (si no se hace ya) que `VinylCard.tsx` **no** es el punto de partida del rediseño — el componente real a skinear es `AlbumCard` (`features/search/ui/AlbumCard.tsx`), tal como ya se estableció en `FRONTEND_VISION.md`.
- **Esfuerzo estimado**: incluido en TD-08.
- **Prioridad**: P3.
- **Severidad**: **Informational**.

---

# Riesgos

| ID | Riesgo | Severidad |
|---|---|---|
| UX-01 | `/downloads` no existe, referenciado en nav | Critical |
| UX-03 | Sin navegación móvil (<1024px) | Critical |
| UX-02 | `/library`/`/settings` placeholders sin comunicación | High |
| UX-05/TD-12 | `PlayerBar` decorativo, sin reproducción | High |
| UX-04/TD-13 | `prefers-reduced-motion` ausente | Medium (High si se inicia rediseño) |
| UX-07 | Toast: conexión real no confirmada | Medium |
| UX-06 | `<h1>` duplicado en `/history` | Low |
| UX-08 | `style={{}}` en Popover (pendiente validar) | Informational |
| UX-09 | Patrón de estados vacíos/error/carga | Informational (positivo) |
| UX-10 | Hex hardcodeados en código muerto | Informational |

---

# Recomendaciones

1. **Resolver UX-01 (ocultar "Downloads" de la nav) es la acción de menor esfuerzo y mayor impacto inmediato** — un cambio de configuración (`NAV_ITEMS`/`PAGE_TITLES`) sin tocar lógica.
2. **UX-03 (navegación móvil)** debe priorizarse junto con UX-01/UX-02 como un bloque de "completitud de navegación" — idealmente antes de invertir en el rediseño visual, para no rediseñar una navegación que aún no funciona en todos los tamaños de pantalla.
3. **UX-02** (placeholders "Próximamente") reutiliza componentes existentes (`EmptyState`) — esfuerzo trivial, mejora inmediata de percepción.
4. **UX-05** requiere una decisión de producto (¿reproducción in-app es un objetivo?) antes de elegir entre "ocultar" o "implementar".
5. **UX-07** es una validación rápida que puede resolver una ambigüedad importante sobre el feedback global de la app — hacerla temprano.
6. Las fases del rediseño visual (`IMPLEMENTATION_PLAN.md`) pueden proceder **en paralelo** a estas correcciones, pero **UX-04 (prefers-reduced-motion)** ya está correctamente capturado como bloqueante de la Fase 0 de ese plan — no se duplica aquí más allá de la referencia.

---

# Roadmap

| Fase | Alcance | Hallazgos | Esfuerzo |
|---|---|---|---|
| **Fase 1 — Navegación honesta** | Ocultar/ajustar entradas de nav para `/downloads`, `/library`, `/settings`; placeholders "Próximamente" | UX-01, UX-02 | S |
| **Fase 2 — Shell móvil** | Drawer/menú móvil para `Sidebar` | UX-03 | M |
| **Fase 3 — Validaciones rápidas** | Toast wiring (UX-07), heading hierarchy (UX-06), Popover style (UX-08) | UX-06, UX-07, UX-08 | S |
| **Fase 4 — Decisión PlayerBar** | Ocultar o planificar reproducción real | UX-05/TD-12 | XS (decisión) |
| **Fase 5 — Página `/downloads` completa (opcional)** | Vista de página completa de jobs, si se decide no solo ocultar | UX-01 (extensión) | M |
| **(Paralelo) Fase 0 del rediseño** | `prefers-reduced-motion` — ya en `IMPLEMENTATION_PLAN.md` | UX-04/TD-13 | S |

---

# Prioridades

| Prioridad | Hallazgos |
|---|---|
| **P0** | UX-01 (ocultar nav) |
| **P1** | UX-02, UX-03 |
| **P2** | UX-04 (condicionado al rediseño), UX-07 |
| **P3** | UX-06, UX-08, UX-10, UX-01 (página completa, opcional) |

---

# Próximos Pasos

1. Aplicar Fase 1 (navegación honesta) — cambio de configuración de bajo riesgo, impacto inmediato en percepción del producto.
2. Validar UX-07 (Toast wiring) — aclara si existe un gap de feedback transversal.
3. Decidir el alcance de `PlayerBar` (UX-05) con el equipo de producto — determina si Fase 4 es "ocultar" (XS) o se convierte en un nuevo proyecto.
4. Planificar Fase 2 (shell móvil) como bloque de trabajo independiente, coordinable con `IMPLEMENTATION_PLAN.md` pero no bloqueado por él.
5. Revisar este documento tras cualquier avance en `IMPLEMENTATION_PLAN.md` Fase 0 (prefers-reduced-motion), ya que UX-04 pasaría de Medium a resuelto.
