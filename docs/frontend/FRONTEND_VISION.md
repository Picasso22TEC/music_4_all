# Frontend Vision — "Tienda de Discos Neón Nocturna" — Music 4 All

Visión creativa del rediseño visual del frontend. Describe **qué** experiencia se quiere construir sobre la base funcional v2 (FSD) ya existente. El **cómo** (tokens, animaciones, accesibilidad) está en `DESIGN_SYSTEM_VISION.md`; el **cuándo/orden** está en `IMPLEMENTATION_PLAN.md`.

Ningún elemento descrito aquí modifica `stores`, `queries`, `mutations`, rutas o el contrato del WebSocket — es una capa visual sobre la arquitectura v2 existente (ver `CLAUDE.md` regla 8, "Restricciones arquitectónicas críticas").

---

## 1. Login Experience Vision

### 1.1 Concepto

El usuario llega a `/login` como si estuviera frente a la **puerta de una tienda de discos de noche**: letrero de neón, vidrio esmerilado, vinilos, humo lumínico y un escáner que recuerda a una interfaz de acceso retro-futurista. Toda la experiencia vive dentro de `LoginForm.tsx` (`frontend/src/features/auth/ui/LoginForm.tsx`), que hoy ya implementa la máquina de estados completa: inicial (`!deviceAuth`) → pendiente (`deviceAuth`, polling) → `authorized` (redirige) / error (expirado o denegado).

### 1.2 Elementos visuales

#### A. Letrero "MUSIC 4 ALL"
- **Descripción**: el bloque actual (`font-mono text-teal-500`, `aria-hidden="true"`) se convierte en un letrero de neón con parpadeo orgánico por letra (`animate-neon-flicker`, fuente `font-pixel` / Press Start 2P).
- **Fase**: MVP simplificado (parpadeo sutil, sin marco metálico) → fase futura (marco con remaches/cadenas).
- **Complejidad**: Media. **Riesgo**: Medio — fotosensibilidad (WCAG 2.3.1), requiere el guard `prefers-reduced-motion` de `DESIGN_SYSTEM_VISION.md` §10 ya implementado.
- **Tokens**: `font-pixel`, `animate-neon-flicker`, `teal-300`/`teal-500`.

#### B. Puerta de vidrio interactiva
- **Descripción**: el `<Card noPadding>` actual se convierte en una "puerta de vidrio esmerilado" — `backdrop-blur` + marco con gradiente gris, que se aclara (`backdrop-blur` reducido) al pasar de estado inicial a `deviceAuth` pendiente, simulando que la puerta se abre.
- **Fase**: MVP (blur + transición de estado vía `AnimatePresence` local entre los dos bloques `if (deviceAuth) {...} else {...}` ya existentes).
- **Complejidad**: Baja-media. **Riesgo**: Bajo — es un wrapper visual sobre `Card`; el formulario interno (`aria-labelledby`, etc.) no cambia.
- **Tokens**: `Card`, `backdrop-blur-*`, `border-subtle`, `shadow-lg`.

#### C. Display retro OAuth
- **Descripción**: el `userCode` (hoy en `<Badge variant="format">`) y el enlace `verificationUriComplete` (hoy `<a href>` real) se presentan dentro de un "display" estilo VCR/Nixie (`font-retro` / VT323, `text-shadow` simulando segmentos). El `<a>` y el texto del código **siguen siendo los mismos nodos funcionales** (mismo `href`, mismo `aria-label`) — el display es un skin envolvente.
- **Fase**: MVP (estilo visual del display) → fase futura (animación de "ticket que se imprime", ver punto siguiente).
- **Complejidad**: Media. **Riesgo**: Bajo, **si** se preserva el nodo `<a>`/`aria-label` existente (regla no negociable, `DESIGN_SYSTEM_VISION.md` §10.3).
- **Tokens**: `font-retro`, `teal-500`, `Badge`.

#### D. Vinilo giratorio durante autorización
- **Descripción**: mientras `pollingQuery.isFetching` es `true` (condición que **ya existe** y hoy solo muestra el texto "◌ Waiting for authorization…"), se muestra un vinilo decorativo girando (`animate-vinyl-spin`, `rotate: 360deg` infinito linear).
- **Fase**: MVP.
- **Complejidad**: Baja. **Riesgo**: Ninguno — reutiliza una condición de estado ya presente, es puramente decorativo (`aria-hidden`).
- **Tokens**: `animate-vinyl-spin`, `surface-rack`/`surface-studio` (disco), `teal-500` (detalle).

#### E. Ticket de activación
- **Descripción**: animación de entrada del bloque C (display retro) simulando un ticket que "sale por una ranura" — `clip-path`/`height` + Framer Motion, al transicionar de estado inicial a `deviceAuth`.
- **Fase futura** (depende de C estando ya implementado).
- **Complejidad**: Media. **Riesgo**: Bajo — animación de entrada sobre un nodo que ya existe.

#### F. Escáner láser ambiental
- **Descripción**: línea horizontal delgada que recorre la pantalla de arriba a abajo cada pocos segundos, capa `absolute inset-0 pointer-events-none -z-10`.
- **Fase**: futura (tras definir el guard de accesibilidad).
- **Complejidad**:-Baja-media. **Riesgo**: Medio — sujeto a WCAG 2.3.1 igual que el letrero (§10.2 de `DESIGN_SYSTEM_VISION.md`); frecuencia baja, no infinita sin pausa.
- **Tokens**: `animate-laser-scan`, `teal-300`/`synthwave-blue`.

#### G. Partículas de polvo neón + humo volumétrico
- **Descripción**: componente compartido `NeonParticles` (ver también Dashboard §2.2-D) — esferas que titilan (`animate-particle-drift`) combinadas con capas de gradiente que simulan humo. El "humo reactivo al mouse" es opcional y debe usar `transform` vía `rAF` con `passive: true`, deshabilitado en touch/`prefers-reduced-motion`.
- **Fase**: MVP (partículas estáticas/lentas, sin parallax de mouse) → fase futura (parallax).
- **Complejidad**: Media. **Riesgo**: Bajo si está aislado (no se suscribe a `auth.store`, no re-renderiza `LoginForm`).
- **Tokens**: `animate-particle-drift`, `teal-300`, `synthwave-magenta`/`synthwave-pink` (uso restringido).

#### H. Contador de expiración del código
- **Descripción**: cuenta regresiva visual basada en `DeviceAuthCode.expiresIn` (`frontend/src/entities/session/session.types.ts:20`, ya existe en el tipo, **no implementado** como countdown hoy). Requiere capturar el timestamp de emisión al recibir `deviceAuth` y derivar segundos restantes (preferible `requestAnimationFrame`/recalculo por render frente a `Date.now()`, no `setInterval` con `setState` de alta frecuencia).
- **Es la única pieza con lógica nueva real** — no es solo CSS/Framer.
- **Fase**: MVP funcional simple (texto `mm:ss`) → fase futura (estilo "vela que se consume" o display analógico).
- **Complejidad**: Media. **Riesgo**: Bajo-medio — casos borde: `expiresIn` ya vencido al montar, usuario cambia de pestaña y vuelve (recalcular desde timestamp absoluto, no decrementar un contador en memoria que se pausa en background).
- **Dependencia de diseño**: el countdown es informativo — la expiración real la sigue detectando `pollingQuery.error` (backend devuelve `DEVICE_AUTH_EXPIRED`). El countdown no debe desincronizarse mostrando `00:00` antes de que el polling detecte el error.

#### I. Glitch de error
- **Descripción**: el bloque `role="alert"` existente (borde `semantic-error`, fondo `semantic-error/10`) recibe una animación adicional `animate-glitch-shake` (finita, disparada una vez al aparecer el error, no infinita).
- **Fase**: MVP.
- **Complejidad**: Baja. **Riesgo**: Ninguno — la semántica `role="alert"` y el mensaje no cambian, solo se añade una animación de entrada finita.

#### J. Transición de entrada a la tienda (Login → Dashboard)
- **Descripción**: al detectar `status === 'authorized'`, antes/durante el `router.replace('/dashboard')`, una transición visual (chispas neón + flash breve) marca el paso de "afuera" (Login, `(auth)/layout.tsx`) a "adentro" (Dashboard, `(app)/layout.tsx`).
- **Fase**: futura, **última** del conjunto Login — depende del componente compartido de transición de página descrito en la visión de Dashboard (§2.2-H) y en `IMPLEMENTATION_PLAN.md`.
- **Complejidad**: Alta. **Riesgo**: Alto — cruza dos árboles de React distintos (`(auth)/layout.tsx` hoy es un simple `<>{children}</>`; `(app)/layout.tsx` contiene el shell con el WS singleton). Requiere un overlay a nivel de `app/layout.tsx` raíz, no una solución duplicada por página.

### 1.3 Resumen MVP vs. fase futura — Login

| Elemento | MVP | Fase futura | Complejidad | Riesgo |
|---|---|---|---|---|
| D — Vinilo girando | Sí | — (mejoras de detalle) | Baja | Ninguno |
| B — Puerta de vidrio | Sí | Marco metálico detallado | Baja-media | Bajo |
| I — Glitch de error | Sí | — | Baja | Ninguno |
| C — Display retro | (estilo) | E — animación "ticket" | Media | Bajo |
| A — Letrero neón | (parpadeo simple) | Marco con remaches/cadenas | Media | Medio (a11y) |
| G — Partículas/humo | (estático/lento) | Parallax con mouse | Media | Bajo |
| H — Countdown expiración | (texto `mm:ss`) | Estilo "vela"/analógico | Media | Bajo-medio |
| F — Escáner láser | — | Sí |-Baja-media | Medio (a11y) |
| Puerta abre/cierra (local) | — | Sí | Media | Bajo (a11y live regions) |
| J — Transición a Dashboard | — | (última) | Alta | Alto |
| Escena decorativa completa (plantas, altavoz, cassettes, tocadiscos) | — | (iterativo/opcional) | Alta (esfuerzo) | Bajo (decorativo) |

---

## 2. Dashboard Experience Vision

### 2.1 Concepto

El Dashboard (`(app)/layout.tsx` + `DashboardClient`) se convierte en el **interior de la tienda de discos**: estanterías de vinilos (resultados de búsqueda), luz ambiental neón, un "centro de descargas" iluminado y una barra de reproductor que actúa como mostrador/tocadiscos. A diferencia del Login, el Dashboard vive dentro del shell persistente que monta el **WebSocket singleton** (`useDownloadSocket()` en `DownloadPanel`, montado en `(app)/layout.tsx` fuera de `{children}`) — esto condiciona fuertemente qué se puede animar y cómo.

### 2.2 Elementos visuales

#### A. Estantes virtuales de álbumes
- **Descripción**: el grid de resultados (`SearchResults` → `AlbumCard`) se enmarca visualmente como "estanterías" — fondo con textura/gradiente sutil tipo madera oscura/metal detrás del grid, sin alterar el grid responsive existente.
- **Fase**: mejora intermedia. **Complejidad**: Baja. **Riesgo**: Ninguno (decorativo, capa de fondo).

#### B. Vinyl Cards
- **Descripción**: skin de `AlbumCard` (`frontend/src/features/search/ui/AlbumCard.tsx`) que presenta la carátula sobre un disco de vinilo (círculo negro, surcos concéntricos, agujero central), badge de calidad (`resolveQualityBadge` — ya existe, MAX/HIFI/FLAC/AAC vía `Badge`) como "sello neón", y micro-interacciones Framer Motion: hover → `scale-[1.05]` + `rotate(-2deg)` + brillo en el surco; tap → `scale-[0.98]`.
- **Decisión de implementación**: **skin del `AlbumCard` existente**, manteniendo su firma de props (`album`, `onOpen`, `onDownload`) — cero cambios en `SearchResults`/`DashboardClient`. No se crea un componente `VinylCard` con props distintas que obligue a tocar los consumidores.
- **Conexión pendiente**: el click en la carátula ya llama a `onOpen` → `handleOpenAlbum` (hoy solo `console.info` en `DashboardClient`, ver `docs/roadmap.md`) — el rediseño debe preservar esa propagación, no implementar el panel completo.
- **Fase**: MVP (hover/tap + sello de calidad) → fase futura (surcos animados, reflejo dinámico).
- **Complejidad**: Media. **Riesgo**: Medio — duplicación si se crea un componente nuevo en vez de skin; mitigado por la decisión anterior.

#### C. Audio visualizer (AudioWaves)
- **Descripción**: fila de barras verticales tipo ecualizador, detrás del contenido principal del Dashboard, con movimiento "aleatorio pero suave" en colores neón de baja opacidad.
- **Implementación obligatoria**: animación CSS pura (`@keyframes` desfasados por `nth-child`) o Framer Motion `useAnimationFrame` operando sobre `transform` — **no** `useState` + `setInterval` (evita re-render constante, ver `DESIGN_SYSTEM_VISION.md` §11).
- **Fase**: mejora intermedia, solo Dashboard (no Login, no páginas internas). **Complejidad**: Media. **Riesgo**: Bajo-medio (performance si se implementa mal).

#### D. Neon particles
- **Descripción**: mismo componente compartido `NeonParticles` descrito en Login §1.2-G — polvo de neón + vinilos miniatura ascendiendo con opacidad baja, aplicado al fondo del `<main>` del Dashboard.
- **Aislamiento crítico**: debe montarse en una capa que **no** se re-renderice cuando cambian `downloads.store`/`queue` — fuera del árbol que escucha Zustand, o memoizado.
- **Fase**: MVP (versión simple, sin parallax). **Complejidad**: Baja. **Riesgo**: Bajo (perf si mal aislado).

#### E. Download center (skin de `DownloadPanel`)
- **Descripción**: el panel de descargas (`DownloadPanel`, fijo sobre `PlayerBar`, `z-panel:150`) recibe iluminación ambiental neón (glow del borde, acentos de color por estado vía `ProgressBar` rediseñado — ver F).
- **Restricción no negociable**: `DownloadPanel` monta `useDownloadSocket()` como singleton de sesión (`frontend/src/widgets/download-panel/ui/DownloadPanel.tsx:28`, comentario explícito "Always mounted so the WS socket stays alive for the session"). El skin es puramente visual sobre el componente existente — **no** se desmonta, envuelve en `AnimatePresence` con `key` dinámica, ni se reinicializa.
- **Fase**: mejora intermedia (depende de F). **Complejidad**: Media. **Riesgo**: Alto si se toca el árbol de montaje — Bajo si es solo CSS/glow sobre el componente actual.

#### F. ProgressBar neón (estados de descarga)
- **Descripción**: el `ProgressBar` actual (`frontend/src/shared/ui/ProgressBar/ProgressBar.tsx`) ya soporta `variant: 'default'|'download'|'success'|'error'|'indeterminate'` + `animated` con glows (`ANIMATED_GLOWS`). vNext añade: (1) "respiración" (`animate-progress-breathe`, box-shadow pulsante) mientras `animated=true`, (2) mapeo de un glow para el estado "en cola" (`semantic-queue`, ver `DESIGN_SYSTEM_VISION.md` §7.3).
- **Contrato a preservar**: `value`, `variant`, `size`, `animated`, `label`, `role="progressbar"` + `aria-valuenow/min/max/text`. Usado en `DownloadJobItem` (panel + `/downloads`) y `PlayerBar`.
- **Fase**: MVP. **Complejidad**: Media-alta (componente crítico, 3 consumidores). **Riesgo**: Medio (contrato de props + a11y).

#### G. Player Bar inmersivo
- **Descripción**: `PlayerBar` (`frontend/src/widgets/player-bar/ui/PlayerBar.tsx`) — mientras no hay `currentTrack` activo (`usePlayerStore((s) => s.currentTrack)` es `null`, lectura de solo-selector), se muestran líneas láser horizontales finas cruzando la barra (`animate-laser-scan`, capa `absolute inset-0 pointer-events-none -z-10`, sin interferir con artwork/`ProgressBar`/volumen ya presentes).
- **Fase**: mejora intermedia. **Complejidad**:-Baja-media. **Riesgo**: Bajo — lectura de store de solo-selector, no escribe estado.

#### H. Sistema de profundidad visual (transiciones de página)
- **Descripción**: `{children}` dentro de `(app)/layout.tsx` se envuelve en `AnimatePresence mode="wait"` con fundido (`opacity 0→1`) + chispas neón en los bordes (`PageTransitionSparkles`), usando `usePathname()`.
- **Restricción crítica**: `(app)/layout.tsx` es hoy un **Server Component**. `AnimatePresence`/`usePathname()` requieren cliente → se introduce un componente cliente `PageTransition` que envuelve **únicamente** `<main>{children}</main>`. `Sidebar`, `AppHeader`, `SessionRecoveryModal`, `DownloadPanel` (WS singleton) y `PlayerBar` — todos montados fuera de `{children}` hoy — **deben permanecer fuera** del árbol animado con `key={pathname}`. Si quedan dentro, se desmontan/remontan en cada navegación, matando la conexión WS (mismo patrón de bug ya corregido con `isPanelVisible`).
- **Fase**: última del conjunto Dashboard, y compartida con la transición Login→Dashboard (§1.2-J). **Complejidad**: Alta. **Riesgo**: Alto.

#### I. Jerarquía visual de información
- **Descripción**: principio transversal, no un componente — los elementos decorativos (partículas, ondas, láseres, glow ambiental) deben permanecer en capas `z-base`/negativas respecto al contenido funcional (`z-raised`, `z-panel`, `z-sticky`, etc., escala ya definida en `tailwind.config.ts`). Ninguna decoración compite visualmente con: resultados de búsqueda, estado de descargas, controles de reproductor, o regiones `aria-live`.
- **Fase**: principio aplicado en todas las fases, no una fase en sí.

### 2.3 Resumen — MVP visual / mejoras intermedias / experiencia completa

| Elemento | MVP visual | Mejora intermedia | Experiencia completa |
|---|---|---|---|
| D — Neon particles | (simple, aislado) | Parallax, más capas | — |
| C — Audio visualizer | — | Sí | Reacción visual a estado de reproducción (sin acoplar store) |
| F — ProgressBar neón | (glow + breathe) | Glow "en cola" (`semantic-queue`) | — |
| B — Vinyl Cards | (hover/tap + sello) | Surcos animados, reflejo | — |
| G — Líneas láser PlayerBar | — | Sí | — |
| A — Estantes virtuales | — | Sí | Texturas detalladas |
| E — Download center iluminado | — | (depende de F) | — |
| H — Transiciones de página | — | — | (última fase, alto riesgo) |

---

## 3. Principio transversal — sin tocar lógica de negocio

En ambas visiones (Login y Dashboard), ningún elemento descrito requiere cambios en:

- `auth.store`, `downloads.store`, `player.store`, `settings.store` (Zustand).
- `useSearchQuery`, `useResolveUrlQuery`, `useStartDownloadMutation`, `useUpdateDownloadMutation`, `useCancelDownloadMutation`, `useInitDeviceAuthMutation`, `useDeviceAuthPollingQuery` (TanStack Query).
- El contrato del WebSocket `/ws/downloads` ni `useDownloadSocket()`.
- Las rutas o el flujo OAuth Device Authorization (`_ensure_https`, polling, fallback de `verification_uri_complete`).

La única excepción es el **contador de expiración** (§1.2-H), que añade estado local (y opcionalmente un campo derivado en `auth.store` si se decide persistir entre remounts) — pieza acotada y descrita explícitamente como tal.
