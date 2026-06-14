# Implementation Plan — "Tienda de Discos Neón Nocturna" — Music 4 All

Roadmap de ejecución para `FRONTEND_VISION.md`, usando los tokens/normas de `DESIGN_SYSTEM_VISION.md`. Cada fase es incremental, autocontenida y validable de forma independiente con `pnpm lint` + `pnpm build` + QA manual (descarga activa, WebSocket, historial, autenticación) antes de pasar a la siguiente.

**Orden**: combina el orden recomendado de los dos análisis previos (Dashboard: D→A→F→C→B→G→E; Login: D→B→error→C→A→E→F→puerta→cross-layout→escena) en una sola secuencia, con una fase 0 de fundaciones que bloquea todo lo que introduce animación continua.

---

## Fase 0 — Fundaciones (bloqueante)

**Descripción**: define la base normativa antes de tocar cualquier componente visual: (1) guard global `prefers-reduced-motion` en `globals.css`, (2) carga de `font-pixel`/`font-retro` vía `next/font/google` en `app/layout.tsx` + tokens `fontFamily` en `tailwind.config.ts`, (3) extensión aditiva de `tailwind.config.ts` con las animaciones vNext de `DESIGN_SYSTEM_VISION.md` §9.2 (sin usarlas todavía), (4) esqueleto del componente compartido `PageTransition`/overlay raíz (sin activar `AnimatePresence` con `key={pathname}` aún — solo se crea el archivo y se monta de forma neutra).

- **Esfuerzo estimado**: M (1–2 días).
- **Impacto visual**: Ninguno todavía (no hay cambios visibles).
- **Impacto técnico**: Medio — toca `globals.css`, `tailwind.config.ts`, `app/layout.tsx` (raíz).
- **Impacto en rendimiento**: Ninguno.
- **Riesgo de regresión**: 🟢 Bajo — adiciones puramente declarativas, sin uso activo.
- **Pruebas manuales requeridas**: `pnpm build` sin errores; verificar que `prefers-reduced-motion: reduce` en DevTools no cambia nada visible aún (no hay animaciones que desactivar todavía).
- **Pruebas automatizadas requeridas**: ninguna nueva — `pnpm lint` + `pnpm build` deben seguir pasando.
- **Dependencias previas**: ninguna.
- **Métricas de éxito**: `tailwind.config.ts` contiene los tokens de §9.2 de `DESIGN_SYSTEM_VISION.md`; `globals.css` contiene el bloque `@media (prefers-reduced-motion: reduce)`; `next lint`/`next build` verdes.

---

## Fase 1 — Botón con variante `neon`

**Descripción**: añadir `'neon'` a `ButtonVariant` (`frontend/src/shared/ui/Button/Button.tsx`) como entrada adicional en `VARIANTS` — borde `teal-300`/`teal-500`, fondo translúcido, `hover:shadow-glow-active`, texto en mayúsculas/`tracking-wide`. Cambio aditivo al union type y al record — no afecta variantes existentes.

- **Esfuerzo estimado**: S (0.5 día).
- **Impacto visual**: Bajo-medio — solo donde se aplique `variant="neon"` explícitamente (ningún botón existente cambia por defecto).
- **Impacto técnico**: Bajo — un nuevo valor en un `Record`, aditivo.
- **Impacto en rendimiento**: Ninguno.
- **Riesgo de regresión**: 🟢 Bajo — `ButtonVariant` es un union type; TypeScript no rompe consumidores existentes al añadir un miembro.
- **Pruebas manuales requeridas**: render visual de un botón con `variant="neon"` en estado normal/hover/focus/disabled.
- **Pruebas automatizadas requeridas**: ninguna nueva (no hay test runner de frontend, ver `docs/roadmap.md` §2.5); `pnpm build` debe compilar.
- **Dependencias previas**: Fase 0 (tokens de glow ya definidos — reutiliza `shadow-glow-active` existente, sin tokens nuevos).
- **Métricas de éxito**: `pnpm lint`/`pnpm build` verdes; los 5 variantes existentes (`primary/secondary/ghost/danger/icon-only`) sin cambios visuales.

---

## Fase 2 — Login: vinilo girando durante el polling

**Descripción**: dentro de `LoginForm.tsx`, cuando `pollingQuery.isFetching === true` (condición ya existente), renderizar un vinilo decorativo (`animate-vinyl-spin`, `aria-hidden="true"`) junto al texto "◌ Waiting for authorization…".

- **Esfuerzo estimado**: S (0.5 día).
- **Impacto visual**: Medio — primer elemento "temático" visible del rediseño.
- **Impacto técnico**: Bajo — un elemento decorativo adicional condicionado por estado ya leído.
- **Impacto en rendimiento**: Ninguno — una sola instancia, animación CSS/Framer declarativa.
- **Riesgo de regresión**: 🟢 Ninguno.
- **Pruebas manuales requeridas**: iniciar Device Auth, verificar que el vinilo gira solo durante `isFetching`; verificar `prefers-reduced-motion: reduce` deja el vinilo estático.
- **Pruebas automatizadas requeridas**: ninguna.
- **Dependencias previas**: Fase 0 (`animate-vinyl-spin` + guard de reduced-motion).
- **Métricas de éxito**: el flujo OAuth (`POST /session/device-auth` → polling → `authorized`/error) funciona idéntico a hoy; el vinilo no afecta el `aria-live` de "Waiting for Tidal authorization".

---

## Fase 3 — Login: puerta de vidrio (skin de `Card`)

**Descripción**: el `<Card noPadding>` del login recibe `backdrop-blur-*` + marco con gradiente (borde metálico), con una transición de "aclarado" entre el estado inicial y `deviceAuth` pendiente vía `AnimatePresence` local (envolviendo solo el contenido interno del `Card`, no el `Card` en sí).

- **Esfuerzo estimado**: S-M (0.5–1 día).
- **Impacto visual**: Alto — cambia el contenedor principal de toda la página de login.
- **Impacto técnico**: Bajo — wrapper visual sobre `Card`, sin cambios de props.
- **Impacto en rendimiento**: Ninguno (`backdrop-blur` es GPU-accelerated, una sola instancia).
- **Riesgo de regresión**: 🟢 Bajo — `aria-labelledby="login-heading"` y la estructura interna del formulario no cambian.
- **Pruebas manuales requeridas**: verificar contraste de texto sobre el fondo con blur (WCAG AA); verificar foco visible (`focus-visible:shadow-glow-focus`) sigue funcionando sobre el nuevo fondo.
- **Pruebas automatizadas requeridas**: ninguna.
- **Dependencias previas**: Fase 0.
- **Métricas de éxito**: `pnpm build` verde; lectores de pantalla anuncian el formulario igual que antes (mismo árbol ARIA).

---

## Fase 4 — Login: glitch de error

**Descripción**: el bloque `role="alert"` existente (borde `semantic-error`, fondo `semantic-error/10`) recibe `animate-glitch-shake` — animación finita (una sola vez al montar el bloque de error), no infinita.

- **Esfuerzo estimado**: S (0.5 día).
- **Impacto visual**: Bajo-medio — solo visible en el estado de error (código expirado/denegado).
- **Impacto técnico**: Ninguno.
- **Impacto en rendimiento**: Ninguno — animación finita, una sola ejecución.
- **Riesgo de regresión**: 🟢 Ninguno — `role="alert"` y el texto del mensaje no cambian.
- **Pruebas manuales requeridas**: forzar el estado de error (dejar expirar un Device Auth o denegarlo) y verificar que el mensaje sigue siendo anunciado por lectores de pantalla y el "Cancel and try again" sigue funcional.
- **Pruebas automatizadas requeridas**: ninguna.
- **Dependencias previas**: Fase 0.
- **Métricas de éxito**: el flujo de error (`pollingQuery.error` → `clearDeviceAuth()` → mensaje visible → reintento) funciona idéntico a hoy.

---

## Fase 5 — `NeonParticles` compartido (Login + Dashboard)

**Descripción**: nuevo componente `shared/ui/NeonParticles.tsx` — partículas de polvo neón + vinilos miniatura ascendiendo (`animate-particle-drift`), configurable (cantidad, colores desde tokens §2.2 de `DESIGN_SYSTEM_VISION.md`, velocidad). `pointer-events-none`, `aria-hidden="true"`, `absolute inset-0`. Se monta en el fondo de `LoginForm` y del `<main>` del Dashboard. Sin parallax de mouse en esta fase.

- **Esfuerzo estimado**: M (1 día).
- **Impacto visual**: Alto — primer elemento ambiental visible en ambas páginas.
- **Impacto técnico**: Bajo — componente nuevo, sin dependencias de stores.
- **Impacto en rendimiento**: Medio — debe verificarse aislamiento (no se suscribe a `downloads.store`/WS); cantidad de partículas con presupuesto definido (ej. ≤30 elementos animados simultáneos).
- **Riesgo de regresión**: 🟡 Bajo — si se monta dentro de `(app)/layout.tsx`, debe ir en una capa que no se re-renderice con cambios de `downloads.store`/`queue`.
- **Pruebas manuales requeridas**: con una descarga activa (mensajes WS `progress` frecuentes), confirmar en React DevTools Profiler que `NeonParticles` no se re-renderiza; verificar `prefers-reduced-motion: reduce` detiene/oculta las partículas.
- **Pruebas automatizadas requeridas**: ninguna.
- **Dependencias previas**: Fase 0 (`animate-particle-drift` + guard reduced-motion); paleta de §2.2 de `DESIGN_SYSTEM_VISION.md`.
- **Métricas de éxito**: 0 re-renders de `NeonParticles` durante una descarga activa; `pnpm build` verde.

---

## Fase 6 — `AudioWaves` (ecualizador, Dashboard)

**Descripción**: nuevo componente `shared/ui/AudioWaves.tsx` — fila de barras verticales con movimiento desfasado (`@keyframes` por `nth-child` o Framer `useAnimationFrame` sobre `transform`), colores neón de baja opacidad, solo en el fondo del Dashboard (no Login, no páginas internas como `/downloads`/`/history`).

- **Esfuerzo estimado**: M (1–1.5 días).
- **Impacto visual**: Medio-alto — refuerza la atmósfera "tienda" solo en la vista principal.
- **Impacto técnico**: Bajo — componente nuevo, montado condicionalmente en `DashboardClient`.
- **Impacto en rendimiento**: Medio — riesgo principal del plan si se implementa con `useState`+`setInterval` (re-render constante); mitigado por la implementación obligatoria CSS/`useAnimationFrame` (`DESIGN_SYSTEM_VISION.md` §11).
- **Riesgo de regresión**: 🟡 Bajo-medio (performance).
- **Pruebas manuales requeridas**: Profiler de React durante navegación y durante descarga activa — `AudioWaves` no debe aparecer como re-renderizado; verificar que solo aparece en `/dashboard`.
- **Pruebas automatizadas requeridas**: ninguna.
- **Dependencias previas**: Fase 0; Fase 5 (comparten convención de aislamiento/perf).
- **Métricas de éxito**: 0 re-renders ligados a `downloads.store`/WS; ausente en `/library`, `/settings`, `/downloads`, `/history`.

---

## Fase 7 — `ProgressBar` neón

**Descripción**: extender `frontend/src/shared/ui/ProgressBar/ProgressBar.tsx` — añadir `animate-progress-breathe` (box-shadow pulsante) cuando `animated=true`, y (si se decide en esta fase) el glow `shadow-glow-queue` para un estado "en cola" basado en `semantic-queue`, registrado formalmente en `tailwind.config.ts` (`DESIGN_SYSTEM_VISION.md` §7.3). **Sin cambios** a la firma `value/variant/size/animated/label` ni a los roles ARIA (`role="progressbar"`, `aria-valuenow/min/max/text`).

- **Esfuerzo estimado**: M (1 día).
- **Impacto visual**: Alto — componente visible en `DownloadPanel`, `/downloads` y `PlayerBar` (3 consumidores).
- **Impacto técnico**: Bajo — extensión de `ANIMATED_GLOWS`/`FILL_COLORS` internos, sin tocar `ProgressBarProps`.
- **Impacto en rendimiento**: Bajo — `animate-progress-breathe` es CSS puro (`box-shadow`), no debe re-disparar renders ligados a actualizaciones de progreso por WS (varias/segundo).
- **Riesgo de regresión**: 🟠 Medio — componente crítico con 3 consumidores en producción; cualquier cambio de contrato de props rompe `DownloadJobItem` y `PlayerBar`.
- **Pruebas manuales requeridas**: iniciar una descarga real, verificar el "latido" del glow durante `variant="download"` con `animated=true` en `DownloadPanel` y `/downloads`; verificar `PlayerBar` (`variant={isPlaying ? 'download' : 'default'}`) sin regresión; verificar `prefers-reduced-motion: reduce` deja el glow estático (sin pulso).
- **Pruebas automatizadas requeridas**: si existen tests de snapshot/props para `ProgressBar`, deben seguir pasando (verificar `frontend` — hoy no hay test runner unitario, ver `docs/roadmap.md` §2.5; al menos `pnpm build` con los 3 usos tipados debe pasar).
- **Dependencias previas**: Fase 0 (`animate-progress-breathe`, `shadow-glow-queue`).
- **Métricas de éxito**: los 3 consumidores (`DownloadJobItem` en panel y `/downloads`, `PlayerBar`) renderizan sin error de tipos; `aria-valuenow/min/max/text` sin cambios; descarga real end-to-end (encolar → progreso → completado) sin regresión visual de estado.

---

## Fase 8 — Login: display retro OAuth + ticket de activación

**Descripción**: el `userCode` (`<Badge variant="format">`) y el `<a href={verificationUriComplete}>` se envuelven en un "display" `font-retro` (VT323) con `text-shadow` simulando segmentos VCR/Nixie. Animación de entrada tipo "ticket que sale de una ranura" (`clip-path`/`height` + Framer Motion) al pasar de estado inicial a `deviceAuth`. El `<a>` real y el `aria-label`/`title` de `userCode` **no cambian de nodo**.

- **Esfuerzo estimado**: M (1–1.5 días).
- **Impacto visual**: Alto — es el elemento central del flujo de autenticación.
- **Impacto técnico**: Bajo-medio — wrapper visual sobre nodos existentes; verificar legibilidad de `font-retro` en `text-2xs`/`text-xs` (puede requerir +1 escala, `DESIGN_SYSTEM_VISION.md` §4).
- **Impacto en rendimiento**: Ninguno — animación de entrada finita, una sola instancia.
- **Riesgo de regresión**: 🟡 Medio si se reemplaza el `<a>` por un `<div>` decorativo (prohibido); 🟢 Bajo si se envuelve sin sustituir.
- **Pruebas manuales requeridas**: abrir el enlace de verificación desde el display retro (debe llevar a la página real de activación de Tidal, no a 404 — ver `docs/troubleshooting.md` #3); verificar lector de pantalla anuncia `aria-label="Open Tidal authorization page in a new tab"` y `title="Authorization code: ..."` sin cambios.
- **Pruebas automatizadas requeridas**: si existen, los 14 tests de `_ensure_https`/`start_device_auth` (`backend/tests/test_session_service.py`) no se ven afectados (son backend, fuera del alcance de esta fase, pero confirman que el dato que llega al display sigue siendo una URL absoluta válida).
- **Dependencias previas**: Fase 0 (`font-retro`); Fase 3 (puerta de vidrio, contexto visual).
- **Métricas de éxito**: el enlace de verificación sigue siendo un `<a href>` real con URL absoluta; `userCode` sigue siendo texto seleccionable/anunciado.

---

## Fase 9 — Vinyl Card (skin de `AlbumCard`)

**Descripción**: skin de `frontend/src/features/search/ui/AlbumCard.tsx` — la carátula se presenta sobre un disco de vinilo (círculo `surface-studio`/negro, surcos concéntricos, agujero central vía CSS/SVG), badge de calidad (`resolveQualityBadge` ya existente) como "sello neón" rotado, micro-interacciones Framer Motion (hover: `scale-1.05` + `rotate(-2deg)` + glow en el surco; tap: `scale-0.98`). **Misma firma de props** (`album`, `onOpen`, `onDownload`) — cero cambios en `SearchResults`/`DashboardClient`.

- **Esfuerzo estimado**: M (1.5 días).
- **Impacto visual**: Alto — componente repetido en grid, el cambio más visible del Dashboard.
- **Impacto técnico**: Bajo-medio — skin interno de `AlbumCard`, sin nuevos props ni nuevo componente exportado.
- **Impacto en rendimiento**: Bajo — animaciones por instancia activadas solo en hover/tap (no continuas), `transform`-only.
- **Riesgo de regresión**: 🟡 Medio — riesgo principal es la **duplicación** (crear un `VinylCard` nuevo con props distintas y tener que tocar `SearchResults`); mitigado por la decisión de skin in-place.
- **Pruebas manuales requeridas**: grid de resultados de búsqueda con múltiples álbumes — verificar hover/tap en varias cards simultáneas sin jank; verificar que el click en la carátula sigue invocando `onOpen` (→ `handleOpenAlbum`, hoy `console.info`, ver `docs/roadmap.md`) y el botón "↓ Download" sigue invocando `onDownload`; verificar `next/image` (`images.unoptimized: true`) sigue cargando carátulas de `resources.tidal.com`.
- **Pruebas automatizadas requeridas**: ninguna nueva.
- **Dependencias previas**: Fase 0; Fase 7 (`Badge`/glow tokens compartidos).
- **Métricas de éxito**: `AlbumCardProps` sin cambios; `aria-label` de `article` y botones preservados; `pnpm build` verde.

---

## Fase 10 — Líneas láser en `PlayerBar`

**Descripción**: cuando `usePlayerStore((s) => s.currentTrack)` es `null` (lectura de solo-selector, ya usada hoy), mostrar líneas horizontales finas cruzando `PlayerBar` (`animate-laser-scan`), en una capa `absolute inset-0 pointer-events-none -z-10` que no interfiere con artwork/info de track/`ProgressBar`/volumen.

- **Esfuerzo estimado**: S-M (0.5–1 día).
- **Impacto visual**: Medio — solo visible cuando no hay reproducción activa.
- **Impacto técnico**: Bajo — capa decorativa adicional dentro de `PlayerBar`, lectura de store ya existente.
- **Impacto en rendimiento**: Bajo — animación CSS, baja frecuencia (no infinita sin pausa, según `DESIGN_SYSTEM_VISION.md` §9.2).
- **Riesgo de regresión**: 🟢 Bajo — no escribe estado, no cambia el layout flex de `PlayerBar`.
- **Pruebas manuales requeridas**: verificar que las líneas láser desaparecen al iniciar reproducción (`currentTrack` no nulo) y no se superponen visualmente con `ProgressBar`/controles; `prefers-reduced-motion: reduce` las oculta.
- **Pruebas automatizadas requeridas**: ninguna.
- **Dependencias previas**: Fase 0.
- **Métricas de éxito**: `PlayerBar` sigue siendo `role="region" aria-label="Music player"` sin cambios funcionales; láseres solo visibles sin track activo.

---

## Fase 11 — Login: letrero "MUSIC 4 ALL" con parpadeo neón

**Descripción**: el bloque `<span className="font-mono ... text-teal-500">MUSIC 4 ALL</span>` (ya `aria-hidden="true"`) se convierte en letrero `font-pixel` con parpadeo orgánico por letra (`animate-neon-flicker`, `animation-delay` distinto por `<span>`).

- **Esfuerzo estimado**: M (1 día).
- **Impacto visual**: Alto — elemento de marca más visible del login.
- **Impacto técnico**: Bajo — el bloque ya es decorativo (`aria-hidden`), solo se reestructura en spans por letra.
- **Impacto en rendimiento**: Bajo — animación CSS por elemento, cantidad fija (longitud del texto "MUSIC 4 ALL").
- **Riesgo de regresión**: 🟡 Medio — **accesibilidad (WCAG 2.3.1)**: frecuencia de parpadeo debe ser ≤3 destellos/seg y de área/contraste limitados; requiere el guard `prefers-reduced-motion` de Fase 0 ya activo.
- **Pruebas manuales requeridas**: medir/observar frecuencia de parpadeo (no debe percibirse como estroboscópico); verificar `prefers-reduced-motion: reduce` deja el letrero en estado "encendido" fijo; verificar que sigue `aria-hidden="true"` (no afecta lectores de pantalla).
- **Pruebas automatizadas requeridas**: ninguna.
- **Dependencias previas**: Fase 0 (`font-pixel`, `animate-neon-flicker`, guard reduced-motion — **no mergeable sin esto**).
- **Métricas de éxito**: cumplimiento WCAG 2.3.1 verificado manualmente; letrero estático bajo `reduce`.

---

## Fase 12 — Login: contador de expiración

**Descripción**: única fase con lógica nueva real. Al recibir `deviceAuth` (que incluye `expiresIn: number` segundos, `frontend/src/entities/session/session.types.ts:20`), capturar `issuedAt = Date.now()` y derivar `remaining = expiresIn*1000 - (Date.now() - issuedAt)` recalculado por render/`requestAnimationFrame` (no `setInterval` con `setState` de alta frecuencia). Mostrar como texto `mm:ss` con estilo `font-retro` (MVP) — estilo "vela"/analógico queda para fase futura.

- **Esfuerzo estimado**: M (1 día).
- **Impacto visual**: Medio (MVP) — elemento informativo nuevo.
- **Impacto técnico**: Medio — única pieza con estado/lógica nueva; decidir si vive como estado local de `LoginForm` o como campo derivado adicional en `auth.store` (evaluar necesidad de persistencia entre remounts).
- **Impacto en rendimiento**: Bajo-medio — si se usa `setInterval`, debe limitarse a 1Hz y no disparar re-render de componentes hermanos (aislar en su propio componente).
- **Riesgo de regresión**: 🟡 Bajo-medio — casos borde: `expiresIn` ya vencido al montar (mostrar `00:00` inmediatamente, no negativo); usuario cambia de pestaña y vuelve (recalcular desde `issuedAt` absoluto, no decrementar un contador pausado).
- **Pruebas manuales requeridas**: iniciar Device Auth y verificar countdown decrece correctamente; cambiar de pestaña y volver, verificar que el valor mostrado es coherente con el tiempo real transcurrido; dejar expirar el código y verificar que el countdown llega a `00:00` **antes o al mismo tiempo** que `pollingQuery.error` muestra el mensaje de expiración (no debe quedar "00:00" mostrando el botón de conexión activo).
- **Pruebas automatizadas requeridas**: si se añade lógica extraíble (función pura `computeRemaining(issuedAt, expiresIn)`), es candidata a un test unitario — primera pieza de frontend que podría justificar introducir Vitest (ver `docs/roadmap.md` §2.5), pero no es bloqueante para esta fase.
- **Dependencias previas**: Fase 0; Fase 8 (display retro, contexto visual del countdown).
- **Métricas de éxito**: el countdown nunca muestra un valor negativo; no hay desincronización perceptible entre el countdown llegando a 0 y el backend devolviendo `DEVICE_AUTH_EXPIRED`.

---

## Fase 13 — Login: puerta abre/cierra (AnimatePresence local)

**Descripción**: el `if (deviceAuth) {...} else {...}` actual de `LoginForm` se convierte en dos variantes de `AnimatePresence mode="wait"` **local** (dentro de la "puerta de vidrio" de Fase 3) — transición de "puerta abriéndose" al pasar de estado inicial a pendiente, y "cerrándose" al cancelar/expirar.

- **Esfuerzo estimado**: M (1 día).
- **Impacto visual**: Alto — transición central de la experiencia de login.
- **Impacto técnico**: Medio — `LoginForm` pasa de renderizado condicional simple a `AnimatePresence`; debe preservarse que los bloques `role="status"`/`role="alert"`/`aria-live` permanezcan **fuera** del árbol que se anima o se re-anuncien correctamente tras la transición.
- **Impacto en rendimiento**: Bajo — transición local, una sola página, sin WS de por medio.
- **Riesgo de regresión**: 🟢 Bajo — contenido de la página, no del shell; pero requiere QA de accesibilidad (live regions) tras la animación.
- **Pruebas manuales requeridas**: con lector de pantalla activo, verificar que el cambio de estado (inicial → pendiente → autorizado/error) sigue siendo anunciado; verificar que `handleCancel`/`handleConnect` siguen disparando las mutations correctas durante/después de la animación.
- **Pruebas automatizadas requeridas**: ninguna.
- **Dependencias previas**: Fase 3 (puerta de vidrio), Fase 0.
- **Métricas de éxito**: máquina de estados de `LoginForm` (`!deviceAuth` → `deviceAuth` → `authorized`/error) funcionalmente idéntica; anuncios de accesibilidad preservados.

---

## Fase 14 — Transiciones de página (Dashboard) + transición cross-layout Login→Dashboard

**Descripción**: la fase de mayor riesgo del plan, dividida en dos partes que comparten el mismo componente:

1. **Dashboard**: crear `PageTransition` (componente cliente) que envuelve **únicamente** `<main>{children}</main>` en `(app)/layout.tsx` con `AnimatePresence mode="wait"` + `usePathname()` + fundido/chispas (`PageTransitionSparkles`). `Sidebar`, `AppHeader`, `SessionRecoveryModal`, `DownloadPanel` (WS singleton vía `useDownloadSocket()`), `PlayerBar` permanecen **fuera** de `PageTransition`, sin `key={pathname}`.
2. **Cross-layout (Login → Dashboard)**: al detectar `status === 'authorized'` en `LoginForm`, antes de `router.replace('/dashboard')`, un overlay montado en `app/layout.tsx` (raíz, por encima de `(auth)` y `(app)`) ejecuta la animación de "puerta se cierra + chispas + flash blanco".

- **Esfuerzo estimado**: L (2–3 días).
- **Impacto visual**: Muy alto — afecta toda la navegación interna y la transición de entrada principal.
- **Impacto técnico**: Alto — `(app)/layout.tsx` pasa de Server Component puro a tener un wrapper cliente; `app/layout.tsx` raíz gana un overlay condicional.
- **Impacto en rendimiento**: Medio — `AnimatePresence` con `key={pathname}` re-monta `<main>{children}</main>` en cada navegación (esperado), pero **no** debe re-montar nada fuera de `<main>`.
- **Riesgo de regresión**: 🔴 Alto — si `DownloadPanel`/`useDownloadSocket()` quedan dentro del árbol animado por error, la conexión WS se cierra/reabre en cada navegación (mismo tipo de bug ya corregido con `isPanelVisible`, ver `docs/troubleshooting.md` #4).
- **Pruebas manuales requeridas** (exhaustivas):
  - Navegar `/dashboard` → `/downloads` → `/history` → `/dashboard` con una descarga activa en curso: el progreso en `DownloadPanel` no debe interrumpirse ni reiniciarse (verificar en Network/WS que la conexión `/ws/downloads` no se cierra).
  - Verificar `Sidebar`/`AppHeader`/`PlayerBar` no parpadean/remontan visualmente durante la navegación.
  - Login → Dashboard: verificar la transición no bloquea el `router.replace`, y que tras la transición el Dashboard carga normalmente (sesión persistida, `auth.store` rehidratado).
  - `prefers-reduced-motion: reduce`: las transiciones de página se reducen a un cambio instantáneo o fundido mínimo, sin chispas/flash.
- **Pruebas automatizadas requeridas**: si existe `backend/tests/test_ws_downloads.py`, no se ve afectado (es backend); del lado frontend, esta fase es la candidata más fuerte para una primera prueba E2E (Playwright, no configurado hoy — ver `docs/roadmap.md` §2.5) que verifique "WS permanece conectado tras N navegaciones", pero no es bloqueante para implementar la fase.
- **Dependencias previas**: todas las fases anteriores que definen el lenguaje visual de "chispas"/"flash" (Fase 5 en adelante); Fase 0 (overlay raíz creado como esqueleto).
- **Métricas de éxito**: 0 reconexiones de `/ws/downloads` durante navegación interna (verificable en logs del backend/Network); `DownloadPanel`, `PlayerBar`, `Sidebar`, `AppHeader` no aparecen como desmontados/remontados en React DevTools durante navegación.

---

## Fase 15 — Escena decorativa completa (iterativa/opcional)

**Descripción**: elementos decorativos de alto esfuerzo visual y bajo riesgo funcional — marco de letrero con remaches/cadenas, planta de interior, altavoz vintage, cassettes apilados, tocadiscos decorativo, texturas de estantería detalladas. Representaciones abstractas (siluetas geométricas, gradientes, formas planas) consistentes con el estilo flat/neon — no ilustraciones realistas.

- **Esfuerzo estimado**: XL (abierto, iterativo — se ejecuta en incrementos pequeños sin fecha de cierre fija).
- **Impacto visual**: Muy alto (acumulativo).
- **Impacto técnico**: Bajo — 100% decorativo, `aria-hidden="true"`.
- **Impacto en rendimiento**: Bajo si cada incremento respeta `DESIGN_SYSTEM_VISION.md` §11 (capas aisladas, `transform`/`opacity`).
- **Riesgo de regresión**: 🟢 Bajo.
- **Pruebas manuales requeridas**: por incremento — verificar que no se introduce contenido focuseable/interactivo accidental en elementos decorativos.
- **Pruebas automatizadas requeridas**: ninguna.
- **Dependencias previas**: Fase 14 completada (no bloquea, pero se recomienda estabilizar transiciones antes de añadir más capas visuales).
- **Métricas de éxito**: cada incremento mantiene `pnpm lint`/`pnpm build` verdes y no introduce regresión de performance medible (Profiler).

---

## Tabla resumen de fases

| Fase | Elemento | Esfuerzo | Riesgo regresión | Depende de |
|---|---|---|---|---|
| 0 | Fundaciones (tokens, a11y guard, fuentes, overlay skeleton) | M | 🟢 | — |
| 1 | Button variant `neon` | S | 🟢 | 0 |
| 2 | Login — vinilo girando (polling) | S | 🟢 | 0 |
| 3 | Login — puerta de vidrio | S-M | 🟢 | 0 |
| 4 | Login — glitch de error | S | 🟢 | 0 |
| 5 | `NeonParticles` compartido | M | 🟡 | 0 |
| 6 | `AudioWaves` (Dashboard) | M | 🟡 | 0, 5 |
| 7 | `ProgressBar` neón | M | 🟠 | 0 |
| 8 | Login — display retro + ticket | M | 🟡 | 0, 3 |
| 9 | Vinyl Card (skin `AlbumCard`) | M | 🟡 | 0, 7 |
| 10 | `PlayerBar` líneas láser | S-M | 🟢 | 0 |
| 11 | Login — letrero neón parpadeante | M | 🟡 | 0 |
| 12 | Login — contador de expiración | M | 🟡 | 0, 8 |
| 13 | Login — puerta abre/cierra | M | 🟢 | 0, 3 |
| 14 | Transiciones de página + cross-layout | L | 🔴 | 0, 5+ |
| 15 | Escena decorativa completa | XL (iterativo) | 🟢 | 14 |

---

## Technical Risks Already Identified

Riesgos técnicos transversales que **cualquier** fase debe respetar, clasificados por severidad para todo el plan (no por fase individual).

| Riesgo | Severidad | Descripción | Fases más expuestas |
|---|---|---|---|
| **WebSocket singleton (`useDownloadSocket`)** | 🔴 **High** | `DownloadPanel` (`frontend/src/widgets/download-panel/ui/DownloadPanel.tsx:28`) monta `useDownloadSocket()` como singleton de sesión, fuera de `{children}` en `(app)/layout.tsx`. Cualquier `AnimatePresence`/`key` dinámica que envuelva (directa o indirectamente) este componente lo desmonta/remonta, cerrando la conexión `/ws/downloads` (mismo patrón que el bug ya corregido con `isPanelVisible`, ver `docs/troubleshooting.md` #4). | Fase 14 (directo); Fase 5/6 si `NeonParticles`/`AudioWaves` se montan dentro del árbol incorrecto. |
| **Zustand persistence (`auth.store`, `downloads.store`, `player.store`)** | 🟢 **Low** | Los stores persistidos (`partialize`: solo `status`/`user`/`expiresAt` en `auth.store`) no requieren cambios para ninguna fase visual. El único riesgo sería llamar a `persist`/reset accidentalmente desde un componente decorativo — ninguna fase lo requiere. | Ninguna directamente; Fase 12 solo si se decide persistir el timestamp del countdown en `auth.store` (evaluar necesidad real primero). |
| **TanStack Query cache** | 🟢 **Low** | Ninguna fase modifica `useSearchQuery`, `useResolveUrlQuery`, mutations de descarga, ni `useDeviceAuthPollingQuery`. Las fases de Login (2, 8, 12) **leen** `pollingQuery.isFetching`/`pollingQuery.data`/`pollingQuery.error`, ya expuestos hoy. | Ninguna. |
| **OAuth Device Flow** | 🟡 **Medium** | Fases 2, 3, 4, 8, 11, 12, 13 modifican `LoginForm.tsx`. El riesgo no es la lógica (`_ensure_https`, polling, fallback) sino **preservar los nodos funcionales** (`<a href={verificationUriComplete}>`, `userCode`, `aria-live`, `role="alert"`) dentro de los nuevos skins — ver `DESIGN_SYSTEM_VISION.md` §10.3. | Fase 8 (display retro) es la más sensible — riesgo de reemplazar el `<a>` por un elemento no semántico. |
| **Download queue** | 🟡 **Medium** | Fases 7 y 9 tocan componentes que muestran estado de cola/descarga (`ProgressBar`, `AlbumCard`). El riesgo es de **contrato de props** (`ProgressBarProps`, `AlbumCardProps`), no de lógica de cola — `DownloadPanel`, `useDownloadsStore`, mutations no se tocan. | Fase 7 (3 consumidores en producción) es la más sensible. |
| **Page transitions** | 🔴 **High** | Fase 14 es la única que altera la estructura de `(app)/layout.tsx` (Server Component → wrapper cliente) y `app/layout.tsx` raíz. Es el cambio estructural de mayor alcance de todo el plan. | Fase 14 exclusivamente; Fase 13 es de menor riesgo porque es local a `LoginForm`. |
| **Framer Motion re-mount risks** | 🔴 **High** | Directamente ligado a los dos riesgos anteriores: cualquier `AnimatePresence` con `key` dinámica que incluya (aunque sea indirectamente, por jerarquía de componentes) a `DownloadPanel`, `PlayerBar`, `Sidebar` o `AppHeader` provoca remounts no deseados. Regla de diseño: `key={pathname}` solo en el wrapper de `<main>{children}</main>`, nunca más arriba en el árbol. | Fase 14. |
| **Performance risks** | 🟡 **Medium** | Animaciones continuas (Fases 5, 6, 10, 11) deben estar aisladas de `downloads.store`/`player.store`/WS para no re-renderizar durante descargas activas (mensajes `progress` varias veces por segundo). Mitigado por `DESIGN_SYSTEM_VISION.md` §11 (transform/opacity, sin `setInterval`+`setState`, componentes memoizados/aislados). | Fase 5, 6, 11; Fase 12 si el countdown usa `setInterval` mal aislado. |
| **Accessibility risks** | 🟠 **Medium-High** | `prefers-reduced-motion` no existe hoy en el código (gap confirmado, `docs/roadmap.md` §4) — es **bloqueante** (Fase 0) para toda animación continua. WCAG 2.3.1 (destellos) aplica directamente a Fases 11 (letrero), Login §1.2-F (láser, fase futura) y Fase 4 (glitch). Elementos accesibles existentes (skip-link, `aria-live`, `focus-visible`, roles ARIA) deben preservarse en todas las fases que tocan `LoginForm`/`AlbumCard`/`ProgressBar`. | Fase 0 (si se omite, todo lo posterior queda no conforme); Fase 11 (máxima exposición a WCAG 2.3.1). |

---

## Resumen de dependencias críticas

```
Fase 0 (Fundaciones — BLOQUEANTE)
 ├─ Fase 1 (Button neon)
 ├─ Fase 2 (Login: vinilo)
 ├─ Fase 3 (Login: puerta de vidrio)
 │   ├─ Fase 8 (Login: display retro)
 │   │   └─ Fase 12 (Login: countdown)
 │   └─ Fase 13 (Login: puerta abre/cierra)
 ├─ Fase 4 (Login: glitch error)
 ├─ Fase 5 (NeonParticles)
 │   └─ Fase 6 (AudioWaves)
 ├─ Fase 7 (ProgressBar neón)
 │   └─ Fase 9 (Vinyl Card)
 ├─ Fase 10 (PlayerBar láseres)
 └─ Fase 11 (Login: letrero neón)

Fase 14 (Transiciones de página + cross-layout) — depende de 0 y del lenguaje visual de fases 5+
 └─ Fase 15 (Escena decorativa completa — iterativa)
```
