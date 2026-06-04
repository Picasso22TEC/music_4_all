# Music 4 All — Wireframes de Alta Fidelidad: Dashboard v2

> Versión 2.0 · Junio 2026  
> Derivado de: `docs/brand-identity.md` · `docs/design-system.md` · `docs/frontend-architecture.md`  
> Iterado desde: `docs/wireframes-dashboard.md` v1.0  
> Revisión base: `docs/dashboard-review.md` v1.0  
> Viewport de referencia: 1440 × 900px (desktop principal)  
> **Esta versión resuelve todos los hallazgos CRÍTICO y MAYOR identificados en la revisión.**

---

## Índice

1. [Leyenda de notación](#1-leyenda-de-notación)
2. [Shell v2 — Layout con Download Panel fijo](#2-shell-v2--layout-con-download-panel-fijo)
3. [Regla de glows simultáneos (nueva)](#3-regla-de-glows-simultáneos)
4. [Estado A — Empty State](#4-estado-a--empty-state)
5. [Estado B-loading — URL detectada, cargando metadata](#5-estado-b-loading--url-detectada-cargando-metadata)
6. [Estado B — URL de Tidal detectada (preview completa)](#6-estado-b--url-de-tidal-detectada-preview-completa)
7. [Estado C — Resultados de búsqueda (vista grid)](#7-estado-c--resultados-de-búsqueda-vista-grid)
8. [Estado C-list — Resultados de búsqueda (vista lista)](#8-estado-c-list--resultados-de-búsqueda-vista-lista)
9. [Estado C-zero — Búsqueda sin resultados](#9-estado-c-zero--búsqueda-sin-resultados)
10. [Estado D — Álbum seleccionado (panel de detalle)](#10-estado-d--álbum-seleccionado-panel-de-detalle)
11. [Estado E — Descarga activa (Download Panel fijo, single job)](#11-estado-e--descarga-activa-single-job)
12. [Estado F — Cola múltiple de descargas](#12-estado-f--cola-múltiple-de-descargas)
13. [Estado G — Error de descarga](#13-estado-g--error-de-descarga)
14. [Estado G-recovery — Flujo de recuperación de sesión OAuth](#14-estado-g-recovery--flujo-de-recuperación-de-sesión-oauth)
15. [Componente: Sidebar — todos sus estados](#15-componente-sidebar--todos-sus-estados)
16. [Componente: Player Bar — todos sus estados](#16-componente-player-bar--todos-sus-estados)
17. [Flujo de interacción completo v2](#17-flujo-de-interacción-completo-v2)
18. [Resumen de cambios v1 → v2](#18-resumen-de-cambios-v1--v2)

---

## 1. Leyenda de Notación

```
Superficies:
  ░░░  surface-void     #080B0F  — fondo base, content area
  ▒▒▒  surface-abyss    #0D1117  — sidebar, paneles fijos
  ▓▓▓  surface-console  #131920  — cards, download panel fondo
  ███  surface-studio   #1A2330  — job items dentro del panel, modales
  ▪▪▪  surface-rack     #21303F  — hover, seleccionado, skeletons

Elementos especiales:
  ══╗  borde teal (acento activo, focus ring)
  ●    indicador de estado activo (dot con glow, máx 2 simultáneos)
  ●̲    indicador de estado activo SIN glow (cuando cuota de glows agotada)
  ○    indicador inactivo / en cola
  ▶    botón play / acción primaria
  ⊘    estado vacío / sin contenido
  ~~   texto secundario (text-secondary #8FA3B8)
  __   placeholder (text-ghost #2C3E50)
  ↓    acción de descarga
  ↗    acción de abrir archivo / externo
  ⋯    menú de opciones (Popover)
  [A]  anotación referenciada abajo
  ███  relleno de progreso (color según variante)
  ▨▨▨  skeleton loading (surface-rack animado)

Badges de calidad (máx 8 chars — Design System 3.6):
  [FLAC]   formato de contenedor
  [24-BIT] profundidad de bits
  [MQA]    Master Quality Audio (NO "Master Quality (MQA)")
  [HIRES]  Hi-Res sin MQA

Quality selector inline:
  [MQA ∨]  selector compacto de calidad por-descarga
```

---

## 2. Shell v2 — Layout con Download Panel Fijo

### Cambio arquitectural central

El Download Panel **ya no forma parte del flujo del content area**. Es un elemento de posición fija anclado entre el content area y el Player Bar. Su aparición y desaparición **no causa reflow** del contenido.

```
 1440px
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                          surface-void        │
│  ┌──────────────┬────────────────────────────────────────────────────────────────────────┐  │
│  │▒▒▒▒▒▒▒▒▒▒▒▒▒│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  │
│  │▒  SIDEBAR   ▒│░                                                                      ░│  │
│  │▒  240px     ▒│░          CONTENT AREA — scrollable                                  ░│  │
│  │▒  surface   ▒│░          1160px · surface-void                                       ░│  │
│  │▒  -abyss    ▒│░                                                                      ░│  │
│  │▒            ▒│░          El scroll de este área NO cambia                            ░│  │
│  │▒            ▒│░          cuando aparece el Download Panel.                           ░│  │
│  │▒            ▒│░                                                                      ░│  │
│  │▒            ▒│░          [A] Contenido puede quedar parcialmente                     ░│  │
│  │▒            ▒│░          cubierto por el panel al fondo.                             ░│  │
│  │▒            ▒│░          El usuario scrollea hacia abajo para verlo.                 ░│  │
│  └──────────────┴────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐│
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │
│  │  [B] DOWNLOAD PANEL — position: fixed · z-panel: 150                                 │ │
│  │  Aparece solo cuando hay jobs activos. Colapsa a 1 línea. Expande hacia ARRIBA.       │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐│
│  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ │
│  │  [C] PLAYER BAR — position: fixed · z-sticky: 200 · 80px                             │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Capa de z-index actualizada

| Token | Valor | Elementos |
|---|---|---|
| `z-base` | 0 | Contenido en flujo normal |
| `z-raised` | 100 | Cards con hover elevation |
| `z-panel` | 150 | **[NUEVO]** Download Panel fijo |
| `z-sticky` | 200 | Player Bar, Sidebar, headers fijos |
| `z-overlay` | 300 | Backdrop de modal, drawer overlay |
| `z-modal` | 400 | Modales, drawers laterales |
| `z-toast` | 500 | Notificaciones Toast |
| `z-tooltip` | 600 | Tooltips, Popovers |

**[A] — Por qué el contenido no se reajusta:**  
El panel usa `position: fixed` con coordenadas `bottom: 80px` (sobre el player bar). El content area tiene altura 100% y scrollea independientemente. El panel superpone el fondo del content area. El usuario que tiene items al fondo del viewport scrollea para verlos debajo del panel. Este patrón es idéntico a la barra de chrome al descargar archivos.

**[B] — Download Panel: dos estados visuales:**

Estado colapsado (por defecto cuando hay jobs):
```
│▓  ↓ 2 active · 68% avg · 1 queued          [∨ Expand]         ▓│
```

Estado expandido: crece hacia arriba con `max-height` animado. Ver Estados E y F.

**[C] — Player Bar:**  
`layout-player-h: 80px` es el valor canónico. `space-12` (48px) en el Design System describe padding interno del componente player, no la altura total de la barra. Esta contradicción queda resuelta en el contexto de estos wireframes: **80px es correcto**.

### Regla de radio del Download Panel

El Download Panel fijo que toca los bordes laterales del viewport usa:
- `radius-none` en bordes izquierdo, derecho y superior cuando está expandido
- `radius-md` en el borde superior cuando está colapsado (borde redondeado visible arriba)
- Separación del Player Bar: borde `1px border-subtle` en la parte inferior del panel

Esta excepción está justificada: el panel forma parte de la UI cromática (estructural), no del contenido. Los elementos estructurales que tocan el borde del viewport prescinden de radio por convención de la mayoría de DAWs y apps de sistema. **La regla general queda: `radius-none` para elementos fijos que tocan 2+ bordes del viewport.**

---

## 3. Regla de Glows Simultáneos

> **Fuente**: Brand Identity, sección 11: "Máximo 2 elementos con glow activo simultáneamente."

El Design System no definía resolución de conflicto. La siguiente regla cubre todos los escenarios del Dashboard:

### Tabla de prioridad de glow

| Situación | Player activo | Jobs activos | Regla aplicada |
|---|---|---|---|
| 1 job, sin player | — | 1 | Job 1 recibe `glow-download` ✓ |
| 2 jobs, sin player | — | 2 | Jobs 1 y 2 reciben `glow-download` ✓ |
| 3+ jobs, sin player | — | 3+ | Jobs 1 y 2 reciben `glow-download`. Job 3+ usa dot ● sólido `semantic-info` sin glow |
| Player activo, sin jobs | ✓ | — | Player recibe `glow-active` ✓ |
| Player activo + 1 job | ✓ | 1 | Player recibe `glow-active`. Job 1 recibe `glow-download`. Total: 2 ✓ |
| Player activo + 2+ jobs | ✓ | 2+ | Player recibe `glow-active`. **Solo el job en posición 1 recibe `glow-download`**. Jobs 2+ usan dot ● sólido sin glow. Total: 2 ✓ |

### Notación en wireframes

```
● con glow   →  representado como ●  (dot lleno, animación radial sutil)
● sin glow   →  representado como ●̲  (dot lleno, sin animación, color sólido)
```

**Justificación:** El player recibe prioridad de glow porque su estado (reproducción activa) es más prominente visualmente que el estado de descarga. El primer job recibe glow para indicar actividad del sistema. Los jobs adicionales se distinguen por su posición en la lista, no por acumulación de efectos luminosos.

---

## 4. Estado A — Empty State

Sin cambios estructurales respecto a v1. Cambios aplicados:
- Player Bar: texto de guía eliminado (redundancia R2)
- Input: botón "⌕ Search" reemplazado por el hint `⌘K` cliqueable (redundancia R3)

```
  SIDEBAR                    CONTENT AREA (1160px)
  240px                      ┌──────────────────────────────────────────────────────────────────┐
┌──────────────┐             │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│▒▒▒▒▒▒▒▒▒▒▒▒▒│             │░  ┌──────────────────────────────────────────────────────────┐ ░│
│▒ ■ MUSIC   ▒│             │░  │  [A]                                                     │ ░│
│▒   4 ALL   ▒│             │░  │  Paste a Tidal URL or search albums and tracks            │ ░│
│▒           ▒│             │░  │  __ tidal.com/browse/album/... or "Radiohead OK Computer" │ ░│
│▒ ─────── ▒ │             │░  │                                             [B] ⌘K        │ ░│
│▒●Dashboard ▒│             │░  └──────────────────────────────────────────────────────────┘ ░│
│▒ Library   ▒│             │░                                                               ░│
│▒ Downloads ▒│             │░                                                               ░│
│▒ History   ▒│             │░              [C]                                              ░│
│▒ Settings  ▒│             │░         ┌──────────┐                                          ░│
│▒           ▒│             │░         │  ╔══════╗ │                                         ░│
│▒ ─────── ▒ │             │░         │  ║  ⊘   ║ │  aguja sobre vinilo vacío               ░│
│▒ TIDAL     ▒│             │░         │  ╚══════╝ │  120×120px · teal-500 line art          ░│
│▒ ● HiFi    ▒│             │░         └──────────┘  sin animación en reposo                 ░│
└──────────────┘             │░                       fade-in 300ms al cargar la página       ░│
                             │░                                                               ░│
  [D] DOWNLOAD PANEL         │░  [E]  Paste a URL or search to start downloading             ░│
  (invisible — sin jobs)     │░  ~~  Your downloads will appear here as they progress        ░│
                             └──────────────────────────────────────────────────────────────────┘
  PLAYER BAR
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│░░  ⊘  Nothing playing                                                                   ░░░│
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

**[A] — Input de búsqueda:** `autoFocus` al cargar. Acepta URL y texto sin modo separado.

**[B] — Hint ⌘K:** Reemplaza el botón "⌕ Search" de v1. El hint es cliqueable y activa la búsqueda (equivalente a Enter). Geist Mono `text-2xs`, `surface-rack`. El atajo `⌘K` desde cualquier pantalla retorna el foco al input. **Este atajo debe añadirse al Design System sección 5.2.**

**[C] — Ilustración:** Animación de entrada: `opacity: 0 → 1` en 300ms `ease-out`, con `translateY(8px → 0)`. Sin animación en reposo.

**[D] — Download Panel:** Invisible en Estado A. No ocupa espacio. Aparece solo cuando hay jobs.

**[E] — Texto de guía:** El Player Bar ya no repite la instrucción de búsqueda. El Player Bar vacío muestra solo "⊘ Nothing playing" sin texto adicional.

---

## 5. Estado B-loading — URL Detectada, Cargando Metadata

**Contexto nuevo en v2.** Estado entre el momento en que el sistema detecta una URL de Tidal y el momento en que recibe la respuesta de la API con los metadatos completos. Dura típicamente 1-3 segundos.

```
  SIDEBAR          CONTENT AREA
┌──────────────┐   ┌──────────────────────────────────────────────────────────────────────────┐
│▒▒▒▒▒▒▒▒▒▒▒▒▒│   │░                                                                        ░│
│▒ ■ MUSIC   ▒│   │░ ┌══════════════════════════════════════════════════════════════════════┐ ░│
│▒   4 ALL   ▒│   │░ ║  [A] tidal.com/browse/album/230509486                               ║ ░│
│▒           ▒│   │░ ║  [B] ◌ Fetching metadata...                           ⌘K            ║ ░│
│▒ ─────── ▒ │   │░ └══════════════════════════════════════════════════════════════════════┘ ░│
│▒●Dashboard ▒│   │░                                                                        ░│
│▒ Library   ▒│   │░  [C] URL detected — Album                                              ░│
│▒ Downloads ▒│   │░  ┌──────────────────────────────────────────────────────────────────┐  ░│
│▒ History   ▒│   │░  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ░│
│▒ Settings  ▒│   │░  │▓  ┌────────┐  [D]  ▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨  [E]  ╔══════════════╗  │  ░│
│▒           ▒│   │░  │▓  │▨▨▨▨▨▨▨▨│       ▨▨▨▨▨▨▨▨▨▨                ║   [disabled] ║  │  ░│
│▒ ─────── ▒ │   │░  │▓  │▨▨▨▨▨▨▨▨│       ▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨             ╚══════════════╝  │  ░│
│▒ TIDAL     ▒│   │░  │▓  │▨▨▨▨▨▨▨▨│       ▨▨▨▨▨▨                                        │  ░│
│▒ ● HiFi    ▒│   │░  │▓  │▨▨▨▨▨▨▨▨│       ┌──────┐ ┌──────┐ ┌──────┐                    │  ░│
└──────────────┘   │░  │▓  └────────┘       │▨▨▨▨▨▨│ │▨▨▨▨▨▨│ │▨▨▨▨▨▨│                   │  ░│
                   │░  │▓  96×96px          └──────┘ └──────┘ └──────┘                    │  ░│
  PLAYER BAR       │░  │▓                                                                  │  ░│
┌─────────────────  │░  │▓  [F]                                                             │  ░│
│░ ⊘ Nothing play  │░  │▓  ── · ──────────────────────────────────────────────             │  ░│
└─────────────────  │░  │▓  ▨▨  ▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨   ▨▨▨   ▨▨▨         │  ░│
                   │░  │▓  ▨▨  ▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨   ▨▨▨   ▨▨▨         │  ░│
                   │░  │▓  ▨▨  ▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨   ▨▨▨   ▨▨▨         │  ░│
                   │░  │▓  + 4 more...                                                     │  ░│
                   │░  └──────────────────────────────────────────────────────────────────┘  ░│
                   └──────────────────────────────────────────────────────────────────────────┘
```

### Anotaciones del Estado B-loading

**[A] — Input con borde teal:** El borde focus se activa en el momento de la detección (onPaste), antes de recibir la respuesta. El usuario ve inmediatamente que el sistema procesó el paste.

**[B] — Indicador de fetch:** Texto "◌ Fetching metadata..." en Geist Mono `text-xs`, `text-secondary`. El ◌ rota con `spin 1.5s linear infinite`. El input está en estado `readonly` durante el fetch (no editable para evitar que el usuario modifique la URL mientras se procesa).

**[C] — Label de tipo:** "URL detected — Album" en `teal-500` aparece inmediatamente (se puede inferir el tipo del path de la URL antes de recibir la respuesta). Si el tipo no es inferible, muestra solo "URL detected".

**[D] — Skeleton del artwork:** `96×96px`, `surface-rack`, `radius-md`, animación `shimmer` (gradiente que recorre de izquierda a derecha, 1.5s). No es un spinner — el skeleton comunica forma y posición del contenido que llegará.

**[E] — Botón Download deshabilitado:** Variante `primary` con `opacity: 0.4`, `cursor: not-allowed`. Tiene el texto "↓ Download" pero no es interactivo. El usuario sabe que la acción existe y estará disponible pronto.

**[F] — Skeleton de la track list:** Filas de skeleton con widths variables (para simular títulos de distintas longitudes). Columnas derecha con skeletons uniformes (duración, calidad). Máx 6 filas skeleton visibles.

**Transición B-loading → B:** Cuando llega la respuesta, el contenido real reemplaza los skeletons con `fade-in 200ms ease-out`. No hay jump de layout — los elementos reales ocupan exactamente el espacio de los skeletons.

**Error en B-loading:** Si la API devuelve error (URL inválida, timeout, 404):
```
│  ✗  URL not found or inaccessible on Tidal             [✕ Clear]  │
```
El label de tipo cambia a `semantic-error`. El botón Download permanece oculto. El usuario puede limpiar el input con ✕ y volver al Estado A.

---

## 6. Estado B — URL de Tidal Detectada (Preview Completa)

**Cambios respecto a v1:**
- Badge "Master Quality (MQA)" → badge "MQA" (máx 8 chars)
- Track list: ahora permite descarga individual en hover (consistencia con Estado D)
- Quality selector inline en el botón Download
- Selector de calidad por-descarga antes de confirmar

```
  SIDEBAR          CONTENT AREA
┌──────────────┐   ┌──────────────────────────────────────────────────────────────────────────┐
│▒▒▒▒▒▒▒▒▒▒▒▒▒│   │░                                                                        ░│
│▒ ■ MUSIC   ▒│   │░ ┌══════════════════════════════════════════════════════════════════════┐ ░│
│▒   4 ALL   ▒│   │░ ║  [A] tidal.com/browse/album/230509486                               ║ ░│
│▒           ▒│   │░ ║                                                              ⌘K      ║ ░│
│▒ ─────── ▒ │   │░ └══════════════════════════════════════════════════════════════════════┘ ░│
│▒●Dashboard ▒│   │░                                                                        ░│
│▒ Library   ▒│   │░  [B] URL detected — Album                                              ░│
│▒ Downloads ▒│   │░  ┌──────────────────────────────────────────────────────────────────┐  ░│
│▒ History   ▒│   │░  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ░│
│▒ Settings  ▒│   │░  │▓  ┌────────┐  [C]  OK Computer                  [D] ╔════════════╗│  ░│
│▒           ▒│   │░  │▓  │        │       Radiohead                        ║  ↓ Download ║│  ░│
│▒ ─────── ▒ │   │░  │▓  │ COVER  │       1997 · EMI Records              ║  [MQA ∨] [E]║│  ░│
│▒ TIDAL     ▒│   │░  │▓  │        │       10 tracks · 42:31              ╚════════════╝│  ░│
│▒ ● HiFi    ▒│   │░  │▓  │        │  [F]  ┌──────┐ ┌────────┐ ┌──────┐               │  ░│
└──────────────┘   │░  │▓  └────────┘       │FLAC  │ │ 24-BIT │ │ MQA  │               │  ░│
                   │░  │▓  96×96px          └──────┘ └────────┘ └──────┘               │  ░│
  PLAYER BAR       │░  │▓                                                               │  ░│
┌─────────────────  │░  │▓  [G]  # · TITLE                     DURATION  ·  QUAL  ·  ↓ │  ░│
│░ ⊘ Nothing play  │░  │▓  ── · ────────────────────────────── ───────── ·  ──── ·  ── │  ░│
└─────────────────  │░  │▓  01 · Airbag                          4:44    ·  FLAC        │  ░│
                   │░  │▓  02 · Paranoid Android                 6:23    ·  FLAC        │  ░│
                   │░  │▓  03 · Subterranean Homesick Alien      4:27    ·  FLAC        │  ░│
                   │░  │▓  04 · Exit Music (For a Film)          4:24    ·  FLAC        │  ░│
                   │░  │▓  05 · Let Down                         4:59    ·  FLAC        │  ░│
                   │░  │▓  06 · Karma Police   [H hover state → ]▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪  ↓  │  ░│
                   │░  │▓  ~~  + 4 more tracks                                          │  ░│
                   │░  └──────────────────────────────────────────────────────────────────┘  ░│
                   └──────────────────────────────────────────────────────────────────────────┘
```

### Anotaciones del Estado B

**[A] — Input con borde teal:** Readonly durante el estado de preview. El usuario puede borrar el input con Backspace para volver al Estado A.

**[B] — Label de tipo:** Geist Mono `text-xs`, `teal-500`. Fade-in 200ms.

**[C] — Preview Card:** `surface-console`, `radius-md`. Artwork 96×96px sin filtros.

**[D] — Botón Download con quality selector:**
```
╔═══════════════════════╗
║  ↓  Download          ║
║  [MQA ∨]              ║
╚═══════════════════════╝
```
El `[MQA ∨]` es un Select compacto en Geist Mono `text-2xs`. Muestra la calidad actualmente configurada en Settings. El usuario puede abrirlo para cambiar la calidad **solo para esta descarga** (no modifica el Setting global). Opciones: Master (MQA), Hi-Res (24-bit FLAC), High (FLAC 16-bit), Normal (AAC 320). Las opciones no disponibles para este álbum aparecen en `text-disabled` con indicador "N/A".

**[E] — Quality selector abierto:**
```
  ┌──────────────────┐
  │ ● Master (MQA)   │  ← seleccionada (teal-500)
  │   Hi-Res 24-bit  │
  │   High FLAC      │
  │   Normal AAC     │
  └──────────────────┘
```
Este selector es el componente Popover del Design System (ver sección de impacto al DS). Ancho mínimo 160px, `surface-studio`, `radius-md`, `shadow-md`.

**[F] — Badges de calidad:** Máximo 8 caracteres cada uno. "MQA" en lugar de "Master Quality (MQA)". El badge MQA tiene borde `teal-500` y texto `teal-300` (variante `quality`).

**[G] — Track list con columna de descarga individual:**  
**Cambio crítico de v1 → v2.** La track list de la URL preview ahora tiene la misma columna `↓` que el Estado D (Detail Panel). Esto elimina la inconsistencia de comportamiento entre los dos estados.

Encabezado de columnas: `# · TITLE · DURATION · QUAL · ↓`. La columna `↓` está siempre visible (no solo en hover) como indicación de que existe la opción de descarga individual.

**[H] — Hover sobre fila de track:**  
Fondo `surface-rack`. El botón `↓` en la columna derecha se activa (pasa de `text-disabled` a `teal-500`, `cursor: pointer`). Clic descarga ese track individual con la calidad del selector del botón principal.

**Justificación de la consistencia B = D:**  
Si el usuario puede ver la track list, puede descargar tracks individuales. La restricción de v1 ("solo lectura en URL preview") creaba fricción sin beneficio claro. El objetivo es coherencia: mismo dato, mismo comportamiento, independientemente de cómo se llegó al álbum.

---

## 7. Estado C — Resultados de Búsqueda (Vista Grid)

**Cambios respecto a v1:**
- Click target en album card clarificado: artwork abre detalle, botón Download tiene área delimitada
- Quality selector en overlay de descarga rápida
- Hover state rediseñado para eliminar ambigüedad de click

```
  SIDEBAR          CONTENT AREA
┌──────────────┐   ┌──────────────────────────────────────────────────────────────────────────┐
│▒▒▒▒▒▒▒▒▒▒▒▒▒│   │░                                                                        ░│
│▒ ■ MUSIC   ▒│   │░  ┌────────────────────────────────────────────────────────────────────┐ ░│
│▒   4 ALL   ▒│   │░  │  Radiohead OK Computer                                        ⌘K  │ ░│
│▒           ▒│   │░  └────────────────────────────────────────────────────────────────────┘ ░│
│▒ ─────── ▒ │   │░                                                                        ░│
│▒●Dashboard ▒│   │░  [A]  Albums (8)        Tracks (23)        Playlists (4)   [B] ≡ ⊞   ░│
│▒ Library   ▒│   │░  ════════════                                                          ░│
│▒ Downloads ▒│   │░                                                                        ░│
│▒ History   ▒│   │░  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ ░│
│▒ Settings  ▒│   │░  │▓▓▓▓▓▓▓▓▓▓│  │▓▓▓▓▓▓▓▓▓▓│  │▓▓▓▓▓▓▓▓▓▓│  │▓▓▓▓▓▓▓▓▓▓│  │▓▓▓▓▓▓▓▓▓▓│ ░│
│▒           ▒│   │░  │▓         ▓│  │▓         ▓│  │▓         ▓│  │▓         ▓│  │▓         ▓│ ░│
│▒ ─────── ▒ │   │░  │▓ ARTWORK ▓│  │▓ ARTWORK ▓│  │▓ ARTWORK ▓│  │▓ ARTWORK ▓│  │▓ ARTWORK ▓│ ░│
│▒ TIDAL     ▒│   │░  │▓         ▓│  │▓         ▓│  │▓         ▓│  │▓         ▓│  │▓         ▓│ ░│
│▒ ● HiFi    ▒│   │░  │▓         ▓│  │▓         ▓│  │▓         ▓│  │▓         ▓│  │▓         ▓│ ░│
└──────────────┘   │░  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤ ░│
                   │░  │ OK Compu…│  │ Pablo Ho…│  │ The Bend…│  │ Amnesiac │  │ Kid A    │ ░│
  PLAYER BAR       │░  │ Radiohead│  │ Radiohead│  │ Radiohead│  │ Radiohead│  │ Radiohead│ ░│
┌─────────────────  │░  │ FLAC 24bit│  │ FLAC 16bit│  │ FLAC 24bit│  │ FLAC 24bit│  │ FLAC 24bit│ ░│
│░ ⊘ Nothing play  │░  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘ ░│
└─────────────────  └──────────────────────────────────────────────────────────────────────────┘
```

#### Estado Hover sobre un Album Card (v2 — click targets clarificados)

```
  ┌──────────────────────────────────────────┐
  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
  │▓                                        ▓│
  │▓  [overlay rgba(0,0,0,0.45)]            ▓│  ← clic en esta área (fuera del botón)
  │▓                                        ▓│    → abre Detail Panel (Estado D)
  │▓    ┌────────────────────────────┐      ▓│
  │▓    │  ↓ Download  [MQA ∨]  [C] │      ▓│  ← botón delimitado ~200×36px
  │▓    └────────────────────────────┘      ▓│    → inicia descarga directa
  │▓                                        ▓│
  │▓                                        ▓│
  ├──────────────────────────────────────── ─┤
  │ OK Computer            [D] ⋯            │
  │ Radiohead                               │
  │ FLAC 24bit                              │
  └──────────────────────────────────────────┘
```

### Anotaciones del Estado C

**[A] — Tabs:** Underline variant. Tab activo: `text-primary`, indicador 2px `teal-500`.

**[B] — Toggle Grid/List:** ⊞ = grid, ≡ = lista. Preferencia persistida en `settings.store.ts`.

**[C] — Botón Download delimitado:**  
**Cambio crítico de v1 → v2.** El botón ya no es "el overlay entero". Es un componente Button real de tamaño definido (~200×36px), centrado en el overlay. El texto es "↓ Download" con el quality selector `[MQA ∨]` inline.

El área del overlay fuera del botón es visualmente oscurecida pero su evento de click propaga al artwork → abre Detail Panel. No hay zona ambigua: el botón tiene `stopPropagation()`, el resto del overlay hace `onClick = openDetailPanel`.

**Tooltip del quality selector:** Al hacer hover sobre `[MQA ∨]`, aparece tooltip "Override download quality for this item". El selector no abre el Detail Panel — abre solo el Popover de selección.

**[D] — Menú contextual ⋯:** Abre Popover (no dropdown) con: "↓ Download Album", "↓ Download Tracks individually" (abre Detail Panel), "View on Tidal ↗", "Copy URL".

---

## 8. Estado C-list — Resultados de Búsqueda (Vista Lista)

**Estado nuevo en v2.** El toggle ≡ en la barra de tabs cambia el grid a una lista densa. Mismas tabs y filtros; diferente presentación de las cards.

```
  SIDEBAR          CONTENT AREA
┌──────────────┐   ┌──────────────────────────────────────────────────────────────────────────┐
│▒▒▒▒▒▒▒▒▒▒▒▒▒│   │░                                                                        ░│
│▒ ■ MUSIC   ▒│   │░  ┌────────────────────────────────────────────────────────────────────┐ ░│
│▒   4 ALL   ▒│   │░  │  Radiohead OK Computer                                        ⌘K  │ ░│
│▒           ▒│   │░  └────────────────────────────────────────────────────────────────────┘ ░│
│▒ ─────── ▒ │   │░                                                                        ░│
│▒●Dashboard ▒│   │░  Albums (8)        Tracks (23)        Playlists (4)     [A] ≡● ⊞     ░│
│▒ Library   ▒│   │░  ════════════                                                          ░│
│▒ Downloads ▒│   │░                                                                        ░│
│▒ History   ▒│   │░  [B]                                                                   ░│
│▒ Settings  ▒│   │░  ┌────────────────────────────────────────────────────────────────────┐ ░│
│▒           ▒│   │░  │▓  ┌──────┐  OK Computer              FLAC · 24-BIT · MQA      ↓   │ ░│
│▒ ─────── ▒ │   │░  │▓  │      │  Radiohead · 1997 · 10 tracks · 42:31          ⋯  ↓   │ ░│
│▒ TIDAL     ▒│   │░  │▓  └──────┘                                                         │ ░│
│▒ ● HiFi    ▒│   │░  ├────────────────────────────────────────────────────────────────────┤ ░│
└──────────────┘   │░  │▓  ┌──────┐  Pablo Honey              FLAC · 16-BIT           ↓   │ ░│
                   │░  │▓  │      │  Radiohead · 1993 · 12 tracks · 41:55          ⋯  ↓   │ ░│
  PLAYER BAR       │░  │▓  └──────┘                                                         │ ░│
┌─────────────────  │░  ├────────────────────────────────────────────────────────────────────┤ ░│
│░ ⊘ Nothing play  │░  │▓  ┌──────┐  The Bends                FLAC · 24-BIT           ↓   │ ░│
└─────────────────  │░  │▓  │      │  Radiohead · 1995 · 12 tracks · 48:47          ⋯  ↓   │ ░│
                   │░  │▓  └──────┘                                                         │ ░│
                   │░  ├────────────────────────────────────────────────────────────────────┤ ░│
                   │░  │▓  ┌──────┐  Amnesiac                 FLAC · 24-BIT · MQA      ↓   │ ░│
                   │░  │▓  │      │  Radiohead · 2001 · 11 tracks · 44:12          ⋯  ↓   │ ░│
                   │░  │▓  └──────┘                                                         │ ░│
                   │░  └────────────────────────────────────────────────────────────────────┘ ░│
                   └──────────────────────────────────────────────────────────────────────────┘
```

### Anotaciones del Estado C-list

**[A] — Toggle ≡ activo:** El icono ≡ tiene fondo `surface-rack` (estado seleccionado). El icono ⊞ vuelve al estado sin fondo.

**[B] — Album List Row:** Estructura horizontal por fila:
- Artwork: 48×48px, `radius-sm`. Click → abre Detail Panel.
- Info primaria: Título en Inter `font-semibold`, `text-sm`. Fila 2: Artista · Año · N tracks · Duración en `text-xs`, `text-secondary`.
- Calidad: badges FLAC, 24-BIT, MQA alineados a la derecha.
- Acciones: ⋯ (menú contextual Popover) + ↓ (descarga directa con quality selector).

**Hover sobre fila:** Fondo `surface-rack`. Los badges de calidad se mantienen visibles. El botón ↓ gana `teal-500`. La fila completa es clickeable hacia el Detail Panel, excepto los botones ⋯ y ↓ que tienen su propio comportamiento.

**Separador entre filas:** 1px `border-subtle` entre rows.

**Ventaja de la vista lista:** Más filas visibles en el mismo viewport. El usuario que conoce sus artistas y solo necesita ver título + calidad + acción prefiere esta vista. La vista grid es mejor para descubrimiento visual por artwork.

---

## 9. Estado C-zero — Búsqueda Sin Resultados

**Estado nuevo en v2.** Cuando la búsqueda de texto devuelve 0 resultados en todos los tabs.

```
  SIDEBAR          CONTENT AREA
┌──────────────┐   ┌──────────────────────────────────────────────────────────────────────────┐
│▒▒▒▒▒▒▒▒▒▒▒▒▒│   │░                                                                        ░│
│▒ ■ MUSIC   ▒│   │░  ┌────────────────────────────────────────────────────────────────────┐ ░│
│▒   4 ALL   ▒│   │░  │  Radiohead Amnesiac OKNOTOK 2026                              ⌘K  │ ░│
│▒           ▒│   │░  └────────────────────────────────────────────────────────────────────┘ ░│
│▒ ─────── ▒ │   │░                                                                        ░│
│▒●Dashboard ▒│   │░  Albums (0)        Tracks (0)        Playlists (0)        [A] ≡ ⊞    ░│
│▒ Library   ▒│   │░                                                                        ░│
│▒ Downloads ▒│   │░                                                                        ░│
│▒ History   ▒│   │░              [B]                                                       ░│
│▒ Settings  ▒│   │░         ┌──────────┐                                                   ░│
│▒           ▒│   │░         │  ╔══════╗ │                                                  ░│
│▒ ─────── ▒ │   │░         │  ║ ~~~~  ║ │  osciloscopio flat line (señal en cero)          ░│
│▒ TIDAL     ▒│   │░         │  ╚══════╝ │  120×120px · text-disabled line art              ░│
│▒ ● HiFi    ▒│   │░         └──────────┘                                                   ░│
└──────────────┘   │░                                                                        ░│
                   │░  [C]  No results for "Radiohead Amnesiac OKNOTOK 2026"                ░│
  PLAYER BAR       │░  ~~  Try a different search or paste a Tidal URL directly             ░│
┌─────────────────  └──────────────────────────────────────────────────────────────────────────┘
│░ ⊘ Nothing play
└─────────────────
```

**[A] — Tabs con ceros:** Los counts muestran (0). Las tabs permanecen visibles pero no son clickeables (no hay resultados que navegar). Color `text-disabled`.

**[B] — Ilustración:** Osciloscopio con señal flat (línea horizontal sin ondas). Brand Identity sección 9: "osciloscopio plano (señal en cero) para cero resultados". `text-disabled` line art, 120×120px. Fade-in 300ms.

**[C] — Texto de resultado:** La query buscada aparece entre comillas para confirmar qué buscó el sistema. La sugerencia es específica: "Tidal URL directamente" es una acción concreta, no genérica.

---

## 10. Estado D — Álbum Seleccionado (Panel de Detalle)

**Cambios respecto a v1:**
- Track list: ya tenía descarga individual. **Sin cambios** — era la versión correcta.
- Badge "Master Quality (MQA)" → "MQA"
- Quality selector en el CTA de Download Album

```
  SIDEBAR     CONTENT AREA (grid, oscurecido)    DETAIL PANEL (420px)
┌────────────┬──────────────────────────────────┬──────────────────────────────────────────┐
│▒▒▒▒▒▒▒▒▒▒▒│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│███████████████████████████████████████████│
│▒ ■ MUSIC  │░                                ░│█  [A] ✕                                  █│
│▒   4 ALL  │░  ┌─────────┐  ┌─────────┐     ░│█                                         █│
│▒          │░  │▓░░░░░░░▓│  │▓░░░░░░░▓│     ░│█  ┌──────────────────────────────────┐   █│
│▒ ─────── ▒│░  │▓░░░░░░░▓│  │▓░░░░░░░▓│     ░│█  │  [B]  ARTWORK 200×200px         │   █│
│▒●Dashboard│░  │▓░░░░░░░▓│  │▓░░░░░░░▓│     ░│█  │                                  │   █│
│▒ Library  │░  └─────────┘  └─────────┘     ░│█  └──────────────────────────────────┘   █│
│▒ Downloads│░  ├─────────┤  ├─────────┤     ░│█                                         █│
│▒ History  │░  │ Album T.│  │ Album T.│     ░│█  [C] OK COMPUTER                        █│
│▒ Settings │░  │ Artist  │  │ Artist  │     ░│█  Radiohead                              █│
│▒          │░  └─────────┘  └─────────┘     ░│█  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ █│
│▒ ─────── ▒│░                               ░│█  1997 · EMI Records · Parlophone       █│
│▒ TIDAL    │░  cards oscurecidas             ░│█  10 tracks · 42:31                     █│
│▒ ● HiFi   │░  overlay rgba(0,0,0,.4)        ░│█  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ █│
└────────────┘░                               ░│█  [D] ┌──────┐ ┌────────┐ ┌─────────┐  █│
               ░                               ░│█      │FLAC  │ │ 24-BIT │ │  MQA    │  █│
  PLAYER BAR   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│█      └──────┘ └────────┘ └─────────┘  █│
┌──────────────────────────────────────────── │█                                         █│
│░ ⊘ Nothing playing                          │█  [E] ╔══════════════════════════════╗   █│
└──────────────────────────────────────────── │█      ║  ↓  Download Album (10 tracks)║   █│
                                              │█      ║       [MQA ∨]                 ║   █│
                                              │█      ╚══════════════════════════════╝   █│
                                              │█                                         █│
                                              │█  [F] Tracks                             █│
                                              │█  ────────────────────────────────────  █│
                                              │█  01  Airbag                  4:44 FLAC  █│
                                              │█  02  Paranoid Android        6:23 FLAC  █│
                                              │█  03  Subterranean Hom…       4:27 FLAC  █│
                                              │█  04  Exit Music (For a Film) 4:24 FLAC  █│
                                              │█  05  Let Down                4:59 FLAC  █│
                                              │█  06  Karma Police [hover →]  ▪▪▪▪▪▪  ↓ █│
                                              │█  07  Electioneering          3:50 FLAC  █│
                                              │█  08  Climbing Up the Walls   4:45 FLAC  █│
                                              │█  09  No Surprises            3:48 FLAC  █│
                                              │█  10  The Tourist             5:24 FLAC  █│
                                              │█                                         █│
                                              │█  [G] METADATA                   [✎]    █│
                                              │█  ────────────────────────────────────  █│
                                              │█  UPC    ·  075678245022               █│
                                              │█  Label  ·  EMI Records Ltd.           █│
                                              │█  Genre  ·  Alternative Rock           █│
                                              │█  ISRC   ·  GB-EMI-97-01234  (track 1) █│
                                              └──────────────────────────────────────────┘
```

**[E] — CTA con quality selector:** El botón Download Album incluye el selector `[MQA ∨]` en la segunda línea, idéntico en comportamiento al del Estado B. La calidad seleccionada se aplica a todos los tracks del álbum.

**[F] — Track list con descarga individual:** Comportamiento idéntico al Estado B: hover sobre fila → fondo `surface-rack` + botón `↓` trailing. Clic descarga ese track individual con la calidad del selector del CTA principal.

**[G] — Icono ✎ en METADATA:** Reservado para edición de metadatos (funcionalidad futura F6). No es interactivo en v1 de implementación — aparece en `text-disabled`, `cursor: default`. Su presencia ahora previene el rediseño posterior.

---

## 11. Estado E — Descarga Activa (Single Job)

**Cambio estructural mayor:** El Download Panel es ahora un elemento fijo, separado del content area. El grid de resultados **no se mueve** cuando aparece el panel.

```
  SIDEBAR          CONTENT AREA (sin cambio en altura)
┌──────────────┐   ┌──────────────────────────────────────────────────────────────────────────┐
│▒▒▒▒▒▒▒▒▒▒▒▒▒│   │░                                                                        ░│
│▒ ■ MUSIC   ▒│   │░  ┌────────────────────────────────────────────────────────────────────┐ ░│
│▒   4 ALL   ▒│   │░  │  Radiohead OK Computer                                        ⌘K  │ ░│
│▒           ▒│   │░  └────────────────────────────────────────────────────────────────────┘ ░│
│▒ ─────── ▒ │   │░                                                                        ░│
│▒●Dashboard ▒│   │░  Albums (8)        Tracks (23)        Playlists (4)         ≡ ⊞       ░│
│▒ Library   ▒│   │░  ════════════                                                          ░│
│▒ Downloads [A]  │░                                                                        ░│
│▒    ①      ▒│   │░  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ ░│
│▒ History   ▒│   │░  │▓▓▓▓▓▓▓▓▓▓│  │▓▓▓▓▓▓▓▓▓▓│  │▓▓▓▓▓▓▓▓▓▓│  │▓▓▓▓▓▓▓▓▓▓│  │▓▓▓▓▓▓▓▓▓▓│ ░│
│▒ Settings  ▒│   │░  │▓ ARTWORK ▓│  │▓ ARTWORK ▓│  │▓ ARTWORK ▓│  │▓ ARTWORK ▓│  │▓ ARTWORK ▓│ ░│
│▒           ▒│   │░  │▓         ▓│  │▓         ▓│  │▓         ▓│  │▓         ▓│  │▓         ▓│ ░│
│▒ ─────── ▒ │   │░  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤ ░│
│▒ TIDAL     ▒│   │░  │ OK Compu…│  │ Pablo Ho…│  │ The Bend…│  │ Amnesiac │  │ Kid A    │ ░│
│▒ ● HiFi    ▒│   │░  │ Radiohead│  │ Radiohead│  │ Radiohead│  │ Radiohead│  │ Radiohead│ ░│
└──────────────┘   │░  │ FLAC 24bit│  │ FLAC 16bit│  │ FLAC 24bit│  │ FLAC 24bit│  │ FLAC 24bit│ ░│
                   │░  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘ ░│
                   │░                                                                        ░│
                   │░  ┌──────────┐  ┌──────────┐  ┌──────────┐                             ░│
                   │░  │▓▓▓▓▓▓▓▓▓▓│  │▓▓▓▓▓▓▓▓▓▓│  │▓▓▓▓▓▓▓▓▓▓│  (grid continúa sin cortes)  ░│
                   │░  │▓ ARTWORK ▓│  │▓ ARTWORK ▓│  │▓ ARTWORK ▓│                             ░│
                   └──────────────────────────────────────────────────────────────────────────┘
                                      ↑ CONTENT AREA — su altura no cambia

  DOWNLOAD PANEL (position: fixed · z-panel:150 · bottom: 80px)
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓  ██  [B] ● Airbag.flac                        [C] OK Computer — Radiohead               ▓│
│▓       3 / 10 tracks                                        3.2 MB/s  ·  1:45 ETA        ▓│
│▓  [D]  ┌─────────────────────────────────────────────────────────────────────┐  [E] ⏸ ✕ ▓│
│▓       │███████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│           ▓│
│▓       └─────────────────────────────────────────────────────────────────────┘           ▓│
│▓       32%                                                                               ▓│
└─────────────────────────────────────────────────────────────────────────────────────────────┘

  PLAYER BAR (position: fixed · z-sticky:200 · bottom: 0)
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│░  ⊘  Nothing playing                                                                    ░░░│
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Anotaciones del Estado E

**[A] — Badge Downloads ①:** Contador circular en el nav item. Aparece/desaparece con fade.

**[B] — Jerarquía corregida (v1 → v2):**
- **Línea primaria:** Nombre del track actual (`Airbag.flac`) + contador (`3 / 10 tracks`) — Inter `font-medium`, `text-sm`, `text-primary`
- **Línea secundaria:** Nombre del álbum — artista (`OK Computer — Radiohead`) — Inter `text-xs`, `text-secondary`

El track activo es el dato más granular y accionable. El álbum es contexto conocido (el usuario lo inició). Prioridad invertida respecto a v1.

**[C] — Métricas en tiempo real:** Geist Mono `text-xs`, `text-secondary`. Velocidad + ETA separados por ` · `.

**[D] — Barra de progreso del panel:**
- Fondo: `surface-abyss` (el panel es `surface-console`, los job items son `███ surface-studio`)
- Fill: `semantic-info`
- Altura: 4px (variante `download`)
- Thumb: ninguno (solo fill progresivo)
- Porcentaje: bajo la barra, Geist Mono `text-xs`, `text-disabled`

**[E] — Acciones:** ⏸ (Pause) y ✕ (Cancel). Cancel abre un Popover de confirmación.

#### Popover de confirmación Cancel

```
  ┌─────────────────────────────────────────────────────┐
  │███  Cancel "OK Computer"?                           │  surface-studio
  │     Files downloaded so far are kept.               │  radius-md
  │                                                     │  shadow-md
  │  [Keep Downloading]  (primary)   [Cancel] (ghost-danger) │
  └─────────────────────────────────────────────────────┘
```

Este Popover es el **componente Popover** que debe añadirse al Design System (ver impacto al DS). Distinto del Tooltip (solo lectura). Tiene `z-tooltip: 600`.

**Superficie de los job items:**  
El Download Panel fondo es `surface-console` (`▓▓▓`). El área interna de cada job item es `surface-studio` (`███`). El `border-subtle` (1px) separa los items entre sí. Esto aplica la regla P4 de Brand Identity: profundidad de negro, nunca plano.

---

## 12. Estado F — Cola Múltiple de Descargas

**Cambios respecto a v1:**
- Panel fijo (no inline)
- Glow rule aplicada: player activo + 2 jobs → solo 1 job con glow
- Header: "Completed: 0" solo aparece cuando hay completados
- Dot ○ para jobs en cola: eliminado el badge "IN QUEUE" (redundante con el dot)
- Job items usan `surface-studio` para profundidad

```
  DOWNLOAD PANEL EXPANDIDO (position: fixed · z-panel:150 · crece hacia ARRIBA)
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓  DOWNLOADS  [A]  Active: 2  ·  Queue: 1                              [B] ⏸ ✕  ∧  ▓│
│▓  ───────────────────────────────────────────────────────────────────────────────────────  ▓│
│▓                                                                                          ▓│
│▓  ┌──  [C] Job 1 (activo, glow activo) ──────────────────────────────────────────────┐   ▓│
│▓  │███  ● Karma Police.flac                            OK Computer — Radiohead       │   ▓│
│▓  │     7 / 10 tracks                                         3.2 MB/s  ·  1:45 ETA │   ▓│
│▓  │     ┌─────────────────────────────────────────────────────────────────────┐  ⏸ ✕│   ▓│
│▓  │     │████████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│      │   ▓│
│▓  │     └─────────────────────────────────────────────────────────────────────┘      │   ▓│
│▓  │     68%                                                                           │   ▓│
│▓  └───────────────────────────────────────────────────────────────────────────────────┘   ▓│
│▓                                                                                          ▓│
│▓  ┌──  [D] Job 2 (activo, SIN glow — player está activo) ────────────────────────────┐   ▓│
│▓  │███  ●̲ Creep.flac                                  Pablo Honey — Radiohead        │   ▓│
│▓  │     3 / 12 tracks                                         1.8 MB/s  ·  3:10 ETA │   ▓│
│▓  │     ┌─────────────────────────────────────────────────────────────────────┐  ⏸ ✕│   ▓│
│▓  │     │████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│      │   ▓│
│▓  │     └─────────────────────────────────────────────────────────────────────┘      │   ▓│
│▓  │     23%                                                                           │   ▓│
│▓  └───────────────────────────────────────────────────────────────────────────────────┘   ▓│
│▓                                                                                          ▓│
│▓  ┌──  [E] Job 3 (en cola) ────────────────────────────────────────────────────────┐   ▓│
│▓  │███  ○  Waiting to start                           Amnesiac — Radiohead         │   ▓│
│▓  │     ┌─────────────────────────────────────────────────────────────────────┐   ✕│   ▓│
│▓  │     │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│      │   ▓│
│▓  │     └─────────────────────────────────────────────────────────────────────┘      │   ▓│
│▓  └───────────────────────────────────────────────────────────────────────────────────┘   ▓│
└─────────────────────────────────────────────────────────────────────────────────────────────┘
  PLAYER BAR  (z-sticky:200, sobre el Download Panel)
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│░  ┌────┐  ● Paranoid Android   ◄◄  ▐▐  ▶▶   ────────────●──────   Vol: ████▓░         ░│
│░  └────┘  Radiohead · OK Computer              3:25 / 6:23                              ░│
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Anotaciones del Estado F

**[A] — Header actualizado:**  
"Completed: 0" eliminado. El header solo muestra contadores con valor > 0. Cuando hay completados: "Active: 1 · Queue: 1 · [Clear 2 completed ✕]" donde "Clear 2 completed" es un botón ghost-sm en lugar de contador pasivo.

**[B] — Controles globales:** ⏸ (Pause All), ✕ (Cancel All), ∧ (colapsar panel).

**[C] — Job 1 activo con glow:** El player está reproduciendo. Según la regla de glows: player tiene `glow-active`, Job 1 tiene `glow-download` → total 2 (límite alcanzado).

**[D] — Job 2 activo SIN glow:** Mismo estado que Job 1 pero sin glow (cuota agotada). El dot ● es `semantic-info` sólido, sin animación. La distinción visual entre Job 1 y Job 2 es solo el glow — ambos muestran sus barras de progreso y métricas normalmente.

**[E] — Job en cola:** Dot ○ vacío `text-disabled`. Texto "Waiting to start" en `text-disabled`. Barra de progreso vacía (`surface-abyss`). **Eliminado el badge "IN QUEUE"** (redundante con el dot ○). Solo el botón ✕ para remover de la cola. No tiene ⏸ (no se puede pausar algo que no ha empezado).

**Estado colapsado del panel con 3 jobs:**
```
│▓  ● 2 active · 46% avg · 1 queued                                [∨ Expand]         ▓│
```

---

## 13. Estado G — Error de Descarga

**Cambios respecto a v1:**
- Toast de error: aparece solo si el panel no está visible (eliminada redundancia R4)
- La lógica condicional está documentada en la anotación

```
  DOWNLOAD PANEL (fijo, expandido)
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│▓  DOWNLOADS  Active: 0  ·  Errors: 1                                                      ▓│
│▓  ───────────────────────────────────────────────────────────────────────────────────────  ▓│
│▓                                                                                          ▓│
│▓  ┌──  [A] Job en error ───────────────────────────────────────────────────────────────┐  ▓│
│▓  │███  ✗  Download failed — 403 Forbidden                                            │  ▓│
│▓  │     [B] Tidal returned 403: session may have expired.          OK Computer        │  ▓│
│▓  │     ┌─────────────────────────────────────────────────────────────────────────┐   │  ▓│
│▓  │     │████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│   │  ▓│
│▓  │     └─────────────────────────────────────────────────────────────────────────┘   │  ▓│
│▓  │     [C] 5 of 10 tracks completed. Files saved to download folder.                  │  ▓│
│▓  │                                                                                    │  ▓│
│▓  │     [D]  [↻ Retry]  [✕ Check Session]  [Remove]                                  │  ▓│
│▓  └───────────────────────────────────────────────────────────────────────────────────┘  ▓│
└─────────────────────────────────────────────────────────────────────────────────────────────┘

  TOAST DE ERROR — CONDICIONAL
  [Solo aparece si el usuario no puede ver el Download Panel — ej. está en otra página]
  ┌──────────────────────────────────────────────────────────────────────────────────────┐
  │█  ✗  Download failed — OK Computer                                           [E] ✕  │
  │█     Tidal returned 403: session expired.              [Check Session]  [↻ Retry]   │
  └──────────────────────────────────────────────────────────────────────────────────────┘
```

### Anotaciones del Estado G

**[A] — Indicador de error:** ✗ estático, `semantic-error`. El job no desaparece automáticamente.

**[B] — Mensaje de error:** Inter `text-xs`, `semantic-error`. Código HTTP + interpretación en lenguaje natural.

**[C] — Estado de archivos parciales:** Informa tracks salvados. Reduce la ansiedad.

**[D] — Acciones de recovery:** Tres botones:
- `[↻ Retry]`: variante `secondary`, borde y texto `semantic-error`. Acción positiva primero.
- `[✕ Check Session]`: variante `secondary`. Abre Estado G-recovery (modal). Acción de diagnóstico.
- `[Remove]`: variante `ghost`. Limpia el job sin retentativa.

**[E] — Toast condicional:**  
La lógica es: si `downloadPanelVisible === true`, el toast **no aparece**. Si el usuario está en History, Library u otra página donde el panel no está visible, el toast sí aparece como notificación push de que algo falló.

Implementación sugerida: el componente Toast de error recibe un prop `suppressWhenPanelVisible: boolean`. El panel comunica su visibilidad vía el store de downloads.

---

## 14. Estado G-recovery — Flujo de Recuperación de Sesión OAuth

**Estado nuevo en v2.** El usuario hizo clic en "Check Session". Este modal cubre el flujo completo de diagnóstico y reautenticación via Device Auth.

### G-recovery Fase 1: Verificando sesión

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │███  [A] Tidal Session                                        [✕]     │
  │███                                                                    │
  │███  ◌  Checking session status...                                    │
  │███                                                                    │
  │███  Connecting to Tidal · picassoivan931@gmail.com                   │
  │███                                                                    │
  └──────────────────────────────────────────────────────────────────────┘
```

**[A] — Modal:** `surface-studio`, `radius-xl`, ancho 480px, `shadow-xl`, `z-modal: 400`. El backdrop es `rgba(0,0,0,0.6)`. El spinner ◌ rota a 1.5s.

### G-recovery Fase 2a: Sesión activa (no necesita renovación)

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │███  Tidal Session                                             [✕]    │
  │███                                                                    │
  │███  ✓  Session is active                                             │
  │███     picassoivan931@gmail.com · HiFi plan                          │
  │███     Expires in: 6 hours 23 minutes                                │
  │███                                                                    │
  │███  [B] The download error may have been a temporary network issue.  │
  │███                                                                    │
  │███  ╔══════════════════════╗    ╔═══════════════════╗                │
  │███  ║  ↻ Retry Download   ║    ║  Close            ║ (ghost)        │
  │███  ╚══════════════════════╝    ╚═══════════════════╝                │
  └──────────────────────────────────────────────────────────────────────┘
```

**[B] — Sesión activa:** Si la sesión está OK, el error fue probablemente de red. El CTA principal es "Retry Download" (acción más probable que el usuario quiere). El modal muestra el expiry para tranquilidad.

### G-recovery Fase 2b: Sesión expirada — Device Auth

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │███  Tidal Session                                             [✕]    │
  │███                                                                    │
  │███  [C] ✗  Session expired                                          │
  │███     Your Tidal session has expired and needs to be renewed.       │
  │███                                                                    │
  │███  ──────────────────────────────────────────────────────────────  │
  │███                                                                    │
  │███  Step 1: Open this URL in your browser                            │
  │███  [D] ┌──────────────────────────────────────────────────────────┐ │
  │███      │  tidal.com/activate                           [↗ Open]  │ │
  │███      └──────────────────────────────────────────────────────────┘ │
  │███                                                                    │
  │███  Step 2: Enter this code                                           │
  │███  [E] ┌───────────────────────┐                                    │
  │███      │  GEIST MONO   AB12-CD │  ← código de dispositivo           │
  │███      └───────────────────────┘                                    │
  │███      ~~  Code expires in 14:32                                    │
  │███                                                                    │
  │███  [F] ◌  Waiting for authorization...                             │
  │███                                                                    │
  │███                                    [Cancel]  (ghost)              │
  └──────────────────────────────────────────────────────────────────────┘
```

**[C] — Estado de expiración:** ✗ `semantic-error`. Mensaje claro, sin jerga técnica.

**[D] — URL del activate:** JetBrains Mono para el URL. El botón `↗ Open` abre el URL en el navegador del sistema (no dentro de la app).

**[E] — Código de dispositivo:** Geist Mono `font-bold`, `text-2xl`, `teal-500`. El código se muestra grande para que el usuario pueda leerlo fácilmente al cambiar de ventana. El countdown "Code expires in 14:32" actualiza cada segundo.

**[F] — Polling activo:** El sistema está haciendo polling al backend mientras el usuario completa la autorización en el navegador. El spinner ◌ indica que la app está esperando.

### G-recovery Fase 3: Autorización completada

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │███  Tidal Session                                             [✕]    │
  │███                                                                    │
  │███  ✓  Session renewed successfully                                 │
  │███     picassoivan931@gmail.com · HiFi plan                          │
  │███     New session valid for 24 hours                                │
  │███                                                                    │
  │███  ╔══════════════════════╗    ╔═══════════════════╗                │
  │███  ║  ↻ Retry Download   ║    ║  Close            ║ (ghost)        │
  │███  ╚══════════════════════╝    ╚═══════════════════╝                │
  └──────────────────────────────────────────────────────────────────────┘
```

La transición de Fase 2b → Fase 3 es automática cuando el backend detecta la autorización. El spinner desaparece, el estado cambia con `fade-in 300ms`. El CTA principal "Retry Download" reinicia el job fallido automáticamente si el usuario hace clic (no redirige a ningún lugar — el modal se cierra y el job se reinicia en el panel de downloads).

**Sidebar durante G-recovery:**  
El dot de conexión Tidal en el sidebar también actualiza en tiempo real. Durante el Device Auth muestra `◌ Reconnecting...`. Al completar muestra `● HiFi`.

---

## 15. Componente: Sidebar — Todos Sus Estados

Sin cambios respecto a v1. Se reproduce por completitud.

```
  ┌────────────────────────────┐
  │ ESTADO: NORMAL AUTENTICADO │
  │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
  │▒  ■ MUSIC 4 ALL           ▒│  ← Geist Mono 700, teal-500, 56px height
  │▒                          ▒│
  │▒  ─────────────────────── ▒│  ← border-subtle 1px
  │▒                          ▒│
  │▒  ⊞  Dashboard            ▒│  ← icono 16px + Inter text-sm
  │▒  ▤  Library              ▒│    text-secondary en reposo
  │▒  ↓  Downloads       ①   ▒│    badge count cuando hay jobs activos
  │▒  ◷  History              ▒│
  │▒  ◉  Settings             ▒│
  │▒                          ▒│
  │▒  ─────────────────────── ▒│
  │▒                          ▒│
  │▒  ● TIDAL HiFi            ▒│  ← dot 6px semantic-success + Geist Mono text-2xs
  │▒  picassoivan931@gmail.com▒│  ← Inter text-xs text-disabled
  │▒  Sign out                ▒│  ← ghost button sm text-disabled
  └────────────────────────────┘

  ┌────────────────────────────┐
  │ ESTADO: ÍTEM ACTIVO        │
  │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
  │▒  ██ Dashboard            ▒│  ← surface-rack + borde-izq 2px teal-500
  │                            │    icono teal-500 · texto text-primary font-medium
  └────────────────────────────┘

  ┌────────────────────────────┐
  │ ESTADO: TIDAL DESCONECTADO │
  │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
  │▒  ○ TIDAL — Disconnected  ▒│  ← dot semantic-error · texto semantic-error
  │▒  Reconnect               ▒│  ← button secondary sm full-width
  └────────────────────────────┘

  ┌────────────────────────────┐
  │ ESTADO: RECONECTANDO       │
  │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
  │▒  ◌ Reconnecting...       ▒│  ← dot spin 2s linear · texto text-secondary
  └────────────────────────────┘
```

---

## 16. Componente: Player Bar — Todos Sus Estados

**Cambio:** La altura canónica es **80px** (`layout-player-h`). `space-12` (48px) describe padding interno, no la altura total.

```
  ┌──────────────────────────────────────────────────────────────────────────────────────────┐
  │ ESTADO: SIN PISTA ACTIVA                                              80px · z-sticky:200│
  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
  │░  ⊘  Nothing playing                                                                  ░│
  └──────────────────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────────────────────────┐
  │ ESTADO: REPRODUCIENDO — glow-active en dot ●                                             │
  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
  │░  ┌────┐  ● Paranoid Android          ◄◄  ▐▐  ▶▶         ────────●────    Vol: ████▓░ ░│
  │░  │    │    Radiohead · OK Computer                        3:25 / 6:23                  ░│
  │░  └────┘                                                                                ░│
  └──────────────────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────────────────────────┐
  │ ESTADO: PAUSADO — dot ○ sin glow                                                         │
  │░  ┌────┐  ○ Paranoid Android    ◄◄  ▶  ▶▶        ────────●────    Vol: ████▓░          ░│
  │░  │    │    Radiohead · OK Computer                3:25 / 6:23                           ░│
  │░  └────┘                                                                                 ░│
  └──────────────────────────────────────────────────────────────────────────────────────────┘
```

Artwork: 48×48px, `radius-sm`. Slider thumb: rectángulo 2×12px `teal-500` (estilo fader de consola, no círculo). Tiempo: Geist Mono `text-xs` `text-secondary`.

---

## 17. Flujo de Interacción Completo v2

```
  LOGIN
    │
    ▼ (autenticación exitosa)
  ┌──────────────────┐
  │  ESTADO A        │ ◄───────────────────────────────────────────────────┐
  │  Empty State     │                                                     │
  └──────────────────┘                                                     │
         │                                                                 │
         ├──── usuario pega URL ─────────► ESTADO B-loading ──────► ESTADO B
         │     (onPaste)                  (API fetching, 1-3s)    (preview completa)
         │                                      │                       │
         │                               error 404/timeout           clic ✕
         │                                      ↓                       │
         │                               "URL not found" inline         │
         │                                                              ─┘
         ├──── usuario escribe + Enter ──────────────────────────► ESTADO C
         │     (text search)                                      (grid results)
         │                                                         │
         │                                             ├── 0 resultados → ESTADO C-zero
         │                                             ├── toggle ≡ → ESTADO C-list
         │                                             └── clic artwork de card → ESTADO D
         │                                                         │
         │◄────────────────────────────────────────────────────────┘
         │         (Detail Panel cerrado, toast "Download started")
         │
         ▼ (cualquier download iniciado)
  Download Panel aparece en posición fija — CONTENT AREA NO SE MUEVE
         │
         ├─ 1 job ──────────────────────────────────────────────── ESTADO E
         ├─ 2+ jobs ─────────────────────────────────────────────── ESTADO F
         │
         ├──── error en job ─────────────────────────────────────── ESTADO G
         │                    │
         │             clic "Check Session"
         │                    │
         │                    ▼
         │             ESTADO G-recovery (modal)
         │             ├── Fase 1: verificando
         │             ├── Fase 2a: activa → Retry
         │             ├── Fase 2b: expirada → Device Auth
         │             └── Fase 3: renovada → Retry automático disponible
         │
         ├──── todos los jobs completados ──────────────────────────────────────┐
         │                                                                      │
         │     Download Panel: job muestra ✓ + "↗ Show in Explorer" por 10s    │
         │     luego fade-out. Panel desaparece cuando todos los jobs completan.│
         │                                                                      ▼
         └──────────────────────────────────────── Regresa a ESTADO A o C ─────┘
                                                   (búsqueda persiste en input)
```

### Transiciones y Duraciones (v2)

| Transición | Animación | Duración |
|---|---|---|
| A → B-loading | Fade-in del skeleton card | 200ms ease-out |
| B-loading → B (éxito) | Skeletons → contenido real (fade) | 200ms ease-out |
| B-loading → error | Skeleton → mensaje de error (fade) | 200ms ease-out |
| B → C | Cross-fade | 200ms ease-out |
| C → D (panel) | Slide in desde derecha + overlay | 250ms ease-out |
| D → cerrado | Slide out hacia derecha | 200ms ease-in |
| Download Panel aparece | Slide up desde bottom + fade | 300ms ease-out |
| Download Panel colapsa | Slide down → 1 línea | 200ms ease-in-out |
| Download Panel expande | Slide up → altura completa | 250ms ease-out |
| Job completado | Barra → verde, mantiene 10s, fade-out | 300ms → 10000ms → 200ms |
| G-recovery modal abre | Fade-in + scale 95%→100% | 200ms ease-out |
| G-recovery fase 2b→3 | Cross-fade de estado | 300ms ease-out |
| Toast aparece (condicional) | Slide in desde derecha | 300ms ease-out |

---

## 18. Resumen de Cambios v1 → v2

### Cambios estructurales

| ID | Tipo | Descripción del cambio |
|---|---|---|
| C1 | **CRÍTICO** | Download Panel: de inline en content area a `position: fixed`, `z-panel: 150`, `bottom: 80px`. Elimina layout shift. |
| C2 | **CRÍTICO** | Estado B-loading añadido: skeleton completo de la preview card durante fetch de API. |
| C3 | **CRÍTICO** | Estado B: track list ahora permite descarga individual (hover + botón ↓). Consistencia con Estado D. |
| C4 | **CRÍTICO** | Z-index: nuevo nivel `z-panel: 150` para el Download Panel, entre `z-raised: 100` y `z-sticky: 200`. |
| C5 | **CRÍTICO** | Player bar height: canónico = 80px (`layout-player-h`). `space-12` (48px) es padding interno, no altura total. |
| C6 | **CRÍTICO** | Regla de glows: tabla de prioridad definida. Máx 2 simultáneos. Player tiene prioridad sobre jobs de descarga. |

### Cambios de componentes y comportamiento

| ID | Tipo | Descripción del cambio |
|---|---|---|
| M1 | **MAYOR** | Quality selector `[QUALITY ∨]` inline en todos los botones Download (Estado B, C hover, D). Override por-descarga. |
| M2 | **MAYOR** | Badge "Master Quality (MQA)" → "MQA" (3 chars). Cumple límite de 8 caracteres del Design System. |
| M3 | **MAYOR** | Click target en Album Card: artwork = abrir detalle, botón Download = área delimitada ~200×36px dentro del overlay. |
| M4 | **MAYOR** | Jerarquía del panel de descarga: track actual es línea primaria, álbum es línea secundaria. |
| M5 | **MAYOR** | Toast de error: condicional. Solo aparece si el Download Panel no está visible en pantalla. |
| M6 | **MAYOR** | Estado G-recovery: flujo completo de modal de sesión OAuth (3 fases: verificando / activa / Device Auth). |
| M7 | **MAYOR** | Superficie de job items: `surface-studio` (nivel 4) dentro del panel `surface-console` (nivel 3). |
| M8 | **MAYOR** | Estado B-loading: error inline cuando URL no existe o API falla (no pantalla nueva). |
| M9 | **MAYOR** | Estado C: vista lista (C-list) añadida, wireframea el toggle ≡ que v1 dejó sin diseñar. |
| M10 | **MAYOR** | Estado C-zero: cero resultados con ilustración de osciloscopio flat line y texto de query entre comillas. |

### Correcciones menores incluidas

| ID | Descripción |
|---|---|
| m1 | Player Bar vacío: eliminado texto "Use search above or go to Library" (redundante con el hero del content area). |
| m2 | Input: botón "⌕ Search" reemplazado por hint ⌘K cliqueable (misma función, menos ruido visual). |
| m3 | Header del panel: "Completed: 0" eliminado. Aparece solo cuando hay completados. Se convierte en "Clear N completed" accionable. |
| m4 | Job en cola: badge "IN QUEUE" eliminado. El dot ○ es suficiente como diferenciador. |
| m5 | Ilustración Estado A: animación de entrada especificada (fade-in + translateY en 300ms). |
| m6 | Icono ✎ reservado en sección METADATA del Detail Panel (para edición futura, no interactivo en v1). |

---

## Riesgos Eliminados

| Riesgo | Descripción | Solución aplicada |
|---|---|---|
| R1 — CRÍTICO | Layout shift al iniciar descargas | Panel fijo (C1) — el contenido no se mueve |
| R2 — CRÍTICO | Ambigüedad de click target en Album Card | Botón Download delimitado (M3) |
| R3 — MAYOR | Vertical space collapse con 3+ jobs | Panel fijo (C1) — el contenido no se comprime |
| R4 — MAYOR | Flujo de error sin resolución completa | Estado G-recovery (M6) |
| R5 — MAYOR | Doble feedback de error (toast + panel) | Toast condicional (M5) |
| R6 — MAYOR | Calidad de descarga opaca en flujo rápido | Quality selector inline (M1) |
| R7 — MAYOR | 3 glows simultáneos violando límite | Regla de prioridad de glows (C6) |

---

## Riesgos Pendientes (MENOR / OBSERVACIÓN — no resueltos en v2)

| Riesgo | Severidad | Nota |
|---|---|---|
| Player bar sin espacio para controles futuros (shuffle, repeat, queue) | MAYOR | Requiere decisión de producto sobre roadmap v2. No resuelto para no añadir complejidad prematura. |
| Download panel sin mecanismo de reordenación de cola | MAYOR | Resolvible añadiendo drag handles (≡) a cada job. Espacio reservado por el diseño actual. |
| Sidebar sin estrategia de colapso | OBSERVACIÓN | Aplaza hasta que el sidebar crezca con nuevas secciones. |
| Soporte multi-servicio en URL detection | OBSERVACIÓN | El label "URL detected — Album" puede recibir un icono de servicio sin rediseño. |
| Barra de progreso simple (sin granularidad de track actual) | MENOR | La barra compuesta (Oportunidad O3 de la revisión) mejora el feedback pero no es crítica. |

---

## Impacto en Frontend Architecture

Los siguientes cambios en estos wireframes requieren actualizaciones en `docs/frontend-architecture.md`:

### 1. Mounting point del Download Panel en (app)/layout.tsx

```
(app)/layout.tsx debe renderizar:
  <Sidebar />
  <main>{children}</main>    ← content area, altura 100vh
  <DownloadPanel />           ← fixed, z-panel:150, bottom:80px — NUEVO
  <PlayerBar />               ← fixed, z-sticky:200, bottom:0
```

El `DownloadPanel` widget se monta en el layout del grupo `(app)/`, no en `dashboard/page.tsx`. Esto lo hace disponible en todas las páginas del grupo.

### 2. Track entity debe incluir albumTitle

El Player Bar muestra "Radiohead · OK Computer" (Artista · Álbum). La entidad `Track` en `entities/track/track.types.ts` debe incluir:
```typescript
albumTitle: string
albumId: string
```
Sin esta propiedad, el store de player no tiene el dato para renderizar la segunda línea del player bar.

### 3. Quality selector requiere estado por-descarga en downloads.store

El quality selector `[QUALITY ∨]` permite override de calidad por descarga individual. El store de downloads necesita:
```typescript
// En DownloadJob
qualityOverride?: AudioQuality  // si undefined, usa settings.audioQuality
```

### 4. Toast de error requiere visibilidad del panel

Para implementar el toast condicional (M5), el sistema necesita:
- Una señal reactiva de `isDownloadPanelVisible` en el store de downloads
- El componente Toast de error lee esta señal y omite su propio render si `isDownloadPanelVisible === true`

### 5. Estado B-loading requiere query de resolución de URL separada

El Estado B-loading implica que existe una query separada de la búsqueda de texto:
```typescript
// features/library/model/library.queries.ts
useResolveUrlQuery(url: string)  // nueva query
useSearchQuery(text: string)     // existente
```
La detección de URL en el input activa `useResolveUrlQuery`, no `useSearchQuery`.

---

## Impacto en Design System

Los siguientes cambios en estos wireframes requieren actualizaciones en `docs/design-system.md`:

### 1. Corrección player bar height (CRÍTICO)

En sección 1.2, tabla de espaciados:
- Cambiar descripción de `space-12` (48px) de "Altura de barra de player" a "Padding vertical interno de componentes altos (player bar padding, modales con padding generoso)"
- La altura del player bar está definida en la tabla de Layout Fijo como `layout-player-h: 80px` — este es el valor canónico.

### 2. Nuevo z-index: z-panel

En sección 1.5, añadir:
```
z-panel: 150  ← Download Panel fijo (entre z-raised y z-sticky)
```

### 3. Regla de radius para elementos fijos que tocan bordes

En sección 1.3, añadir nota:
> "Excepción de radio: elementos con `position: fixed` que tocan 2 o más bordes del viewport usan `radius-none` en los bordes que coinciden con el edge del viewport, y `radius-md` en los bordes internos visibles. Ejemplos: Download Panel fijo (bordes izquierdo, derecho y superior usan `radius-none` cuando expandido; borde superior usa `radius-md` cuando colapsado)."

### 4. Nuevo componente: Popover

En sección 3, añadir entre Tooltip y Tabs:

**3.X — Popover**
- **Propósito:** Capa flotante con interactividad (botones, selects, formularios cortos). Distinto del Tooltip (solo lectura).
- **Usos en el dashboard:** Quality selector, Cancel download confirmation, context menu ⋯, Sign out confirmation.
- **Estructura:** `surface-studio`, `radius-md`, `shadow-md`, `z-tooltip: 600`.
- **Trigger:** Click (no hover). Se cierra con: click fuera, Escape, o acción completada.
- **Accesibilidad:** `role="dialog"`, `aria-modal="true"`, foco atrapado dentro del popover mientras está abierto.
- **Ancho:** `min-width: 160px`, `max-width: 320px`.

### 5. Atajo ⌘K en tabla de keyboard shortcuts

En sección 5.2, añadir:
```
⌘K  → Foco al input de búsqueda principal (desde cualquier página)
```

### 6. Regla de glows simultáneos

En sección 1.4, añadir:
> "Máximo 2 elementos con glow activo simultáneamente. Regla de prioridad: (1) Player bar glow-active cuando hay reproducción, (2) Primer job de descarga activo, (3) Segundo job de descarga activo. Jobs adicionales más allá del cupo usan el color de estado sólido sin animación de glow."

---

*Music 4 All — Dashboard Wireframes v2.0 · Junio 2026*  
*Esta versión resuelve los 7 riesgos identificados y los 11 hallazgos MAYOR de la revisión v1.0.*  
*Siguiente paso: implementar componentes en `frontend/src/shared/ui/` comenzando por Button, Input y el nuevo Popover.*
