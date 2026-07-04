# Music 4 All — Wireframes de Alta Fidelidad: Dashboard

> Versión 1.0 · Junio 2026  
> Derivado de: `docs/brand-identity.md` · `docs/design-system.md` · `docs/frontend-architecture.md`  
> Viewport de referencia: 1440 × 900px (desktop principal)

---

## Índice

1. [Leyenda de notación](#1-leyenda-de-notación)
2. [Shell de la aplicación (layout base)](#2-shell-de-la-aplicación-layout-base)
3. [Estado A — Empty State (primer uso / sin actividad)](#3-estado-a--empty-state)
4. [Estado B — URL de Tidal detectada](#4-estado-b--url-de-tidal-detectada)
5. [Estado C — Resultados de búsqueda por texto (vista grid)](#5-estado-c--resultados-de-búsqueda-vista-grid)
6. [Estado D — Álbum seleccionado (panel de detalle)](#6-estado-d--álbum-seleccionado-panel-de-detalle)
7. [Estado E — Descarga activa (single job)](#7-estado-e--descarga-activa-single-job)
8. [Estado F — Cola múltiple de descargas](#8-estado-f--cola-múltiple-de-descargas)
9. [Estado G — Error de descarga](#9-estado-g--error-de-descarga)
10. [Componente: Sidebar — todos sus estados](#10-componente-sidebar--todos-sus-estados)
11. [Componente: Player Bar — todos sus estados](#11-componente-player-bar--todos-sus-estados)
12. [Flujo de interacción completo](#12-flujo-de-interacción-completo)

---

## 1. Leyenda de Notación

```
Superficies:
  ░░░  surface-void     #080B0F  — fondo base
  ▒▒▒  surface-abyss    #0D1117  — sidebar, paneles fijos
  ▓▓▓  surface-console  #131920  — cards, dropdowns
  ███  surface-studio   #1A2330  — modales, superficies elevadas
  ▪▪▪  surface-rack     #21303F  — hover, seleccionado

Elementos especiales:
  ══╗  borde teal (acento activo, focus ring)
  ●    indicador de estado activo (teal glow)
  ○    indicador inactivo
  ▶    botón play / acción primaria
  ⊘    estado vacío / sin contenido
  ~~   texto secundario (text-secondary #8FA3B8)
  __   placeholder (text-ghost #2C3E50)
  ↓    acción de descarga
  ↗    acción de abrir archivo
  ⋯    menú de opciones
  [A]  anotación referenciada en la sección de descripción
  ███  relleno de progreso (color según variante)
```

---

## 2. Shell de la Aplicación (Layout Base)

Este wireframe muestra el contenedor permanente que envuelve todas las vistas. El Dashboard es el primer contenido que aparece dentro de este shell.

```
 1440px
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                          surface-void #080B0F│
│  ┌──────────────┬────────────────────────────────────────────────────────────────────────┐  │
│  │▒▒▒▒▒▒▒▒▒▒▒▒▒│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  │
│  │▒   [A]     ▒│░                                                                      ░│  │
│  │▒ ■ MUSIC   ▒│░                  CONTENT AREA                                       ░│  │
│  │▒   4 ALL   ▒│░                  1160px · surface-void                               ░│  │
│  │▒▒▒▒▒▒▒▒▒▒▒▒▒│░                                                                      ░│  │
│  │▒           ▒│░                                                                      ░│  │
│  │▒  [B]      ▒│░                                                                      ░│  │
│  │▒ ─────── ▒ │░                                                                      ░│  │
│  │▒ Dashboard ▒│░                                                                      ░│  │
│  │▒ Library   ▒│░                                                                      ░│  │
│  │▒ Downloads ▒│░                                                                      ░│  │
│  │▒ History   ▒│░                                                                      ░│  │
│  │▒ Settings  ▒│░                                                                      ░│  │
│  │▒           ▒│░                                                                      ░│  │
│  │▒ ─────── ▒ │░                                                                      ░│  │
│  │▒  [C]      ▒│░                                                                      ░│  │
│  │▒ TIDAL     ▒│░                                                                      ░│  │
│  │▒ ● HiFi    ▒│░                                                                      ░│  │
│  │▒▒▒▒▒▒▒▒▒▒▒▒▒│░                                                                      ░│  │
│  │  240px      │░                                                                      ░│  │
│  └──────────────┴────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐│
│  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ │
│  │  PLAYER BAR  [D]                                                        80px · surface-void│
│  └─────────────────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Anotaciones del Shell

**[A] — Logo "■ MUSIC 4 ALL"**  
Geist Mono 700, `teal-500`. El cuadrado ■ es el isotipo mínimo de la marca — referencia al LED de power de un equipo Hi-Fi. Ocupa 56px de altura en el top del sidebar. No es un botón; es identidad. Navegar al dashboard se hace desde el ítem "Dashboard" en la nav.

**[B] — Navegación principal**  
5 ítems. Texto Inter 500, `text-sm`. Ítem activo: `text-primary` + borde izquierdo 2px `teal-500` + fondo `surface-rack`. Hover: `text-primary` + fondo `surface-console`. Los ítems tienen un icono Lucide a la izquierda (16px, stroke, `text-disabled` en reposo, `teal-500` en activo).

**[C] — Indicador de conexión Tidal**  
Al fondo del sidebar. Dot ● de 6px `semantic-success` + texto "HiFi" en Geist Mono `text-2xs`. Si hay error de sesión: dot `semantic-error` + texto "Disconnected". Clic en esta área abre el modal de reconexión. Es el único punto de la UI donde se gestiona el estado de sesión de forma visual persistente.

**[D] — Player Bar**  
80px de altura, `surface-void`, separado del contenido por un borde 1px `border-subtle`. Siempre visible. Cuando no hay pista activa, muestra un estado mínimo (ver Wireframe 11).

### Justificaciones UX del Shell

**¿Por qué sidebar fijo en lugar de top navigation?**  
La app es de escritorio. El espacio horizontal es abundante (1440px), el vertical es el recurso escaso. Un sidebar libera la barra superior para el contenido, deja más altura útil para listas de tracks y grids de álbumes, y permite una navegación siempre visible sin ocupar el "primer scroll".

**¿Por qué el Player Bar está separado del sidebar?**  
El Player Bar tiene una función completamente distinta a la navegación: controla la reproducción. Mantenerlo como una franja bottom full-width hace que el usuario lo localice sin pensar (patrón aprendido de Spotify, Winamp, todos los reproductores). Además, cuando se añadan controles del player (eq, crossfade), crecen horizontalmente, no empujando contenido.

**¿Por qué el estado de conexión Tidal va al fondo del sidebar?**  
Es información de estado del sistema, no de navegación. El usuario lo consulta ocasionalmente, no lo usa en cada acción. Ponerlo al fondo crea un patrón análogo a los status bars de terminales y DAWs: información permanente, baja jerarquía visual, siempre disponible.

---

## 3. Estado A — Empty State

**Contexto:** El usuario acaba de autenticarse o regresó al dashboard sin haber buscado nada aún. No hay descargas activas. Es el estado de bienvenida.

```
  SIDEBAR                    CONTENT AREA (1160px)
  240px                      ┌──────────────────────────────────────────────────────────────────┐
┌──────────────┐             │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│▒▒▒▒▒▒▒▒▒▒▒▒▒│             │░  ┌──────────────────────────────────────────────────────────┐ ░│
│▒ ■ MUSIC   ▒│             │░  │                    [A]                                   │ ░│
│▒   4 ALL   ▒│             │░  │  Paste a Tidal URL or search albums and tracks           │ ░│
│▒           ▒│             │░  │  __ tidal.com/browse/album/... or "Radiohead OK Computer"│ ░│
│▒ ─────── ▒ │             │░  │                              [B] ⌕ Search   [C] ⌘K      │ ░│
│▒●Dashboard ▒│             │░  └──────────────────────────────────────────────────────────┘ ░│
│▒ Library   ▒│             │░                                                               ░│
│▒ Downloads ▒│             │░                                                               ░│
│▒ History   ▒│             │░              [D]                                              ░│
│▒ Settings  ▒│             │░         ┌──────────┐                                          ░│
│▒           ▒│             │░         │  ╔══════╗ │                                         ░│
│▒ ─────── ▒ │             │░         │  ║  ⊘   ║ │                                         ░│
│▒ TIDAL     ▒│             │░         │  ╚══════╝ │                                         ░│
│▒ ● HiFi    ▒│             │░         └──────────┘                                          ░│
└──────────────┘             │░                                                               ░│
                             │░  [E]  Paste a URL or search to start downloading             ░│
  PLAYER BAR                 │░  ~~  Your downloads will appear here as they progress        ░│
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│░░ ⊘ Nothing playing  ··  Use search above or go to Library                              ░░░│
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Anotaciones del Estado A

**[A] — Input de búsqueda principal**  
Este es el único hero de la pantalla. Ancho completo del área de contenido menos `space-8` (32px) de padding en cada lado. Altura `lg` (44px). El input recibe foco automático (`autoFocus`) al cargar la página. No hay botón de "modo URL" vs "modo búsqueda": el campo acepta ambos y el sistema detecta el tipo de entrada. Placeholder en dos líneas visualmente: la URL de ejemplo en `text-ghost` y la búsqueda de texto entre comillas.

**[B] — Botón Search**  
Variante `secondary`. Texto "⌕ Search". Se activa con Enter en el input. Texto Inter 500, icono de lupa de Lucide. Nunca se deshabilita mientras haya texto en el input.

**[C] — Keyboard hint `⌘K`**  
Badge de atajo de teclado, posición `trailing` dentro del input. Geist Mono `text-2xs`, `surface-rack`, `text-disabled`. Clic en el hint no hace nada (es informativo). Al presionar `⌘K` desde cualquier lugar de la app, el foco salta al input.

**[D] — Ilustración de empty state**  
Aguja de tocadiscos sobre vinilo vacío, line art en `teal-500` con trazos de `text-disabled`. Dimensiones: 120×120px. Sin animación en reposo (la animación de la aguja solo ocurre cuando hay reproducción activa). Referencia: manual técnico de estudio de grabación.

**[E] — Texto de guía**  
Inter `text-sm`, `text-secondary`. Dos líneas. Primera en `text-primary` (más visible), segunda en `text-secondary`. No es un CTA — no tiene botón. La instrucción es obvia y el campo de búsqueda ya está visible.

### Justificaciones UX del Estado A

**¿Por qué no mostrar "sugerencias" o "trending" en el empty state?**  
El público objetivo (audiófilo, coleccionista, power user) sabe exactamente qué quiere descargar. Sugerencias algorítmicas o contenido "trending" son patrones de Spotify/Apple Music diseñados para el descubrimiento pasivo. Music 4 All es una herramienta de intención: el usuario llega con un objetivo. El empty state facilita ese objetivo sin ruido.

**¿Por qué el input tiene `autoFocus`?**  
El 99% de las interacciones en el Dashboard comienzan con una búsqueda o un paste de URL. Dar el foco automáticamente elimina un clic innecesario. Esto es el mismo principio que el buscador de Google al cargar su homepage.

**¿Por qué un solo campo para URL y texto?**  
Elimina la necesidad de que el usuario tome una decisión de "modo". La detección automática (URL vs. texto) reduce la fricción cognitiva. Un campo único es más rápido de aprender, más rápido de usar, y más consistente con el flujo de trabajo real del audiófilo que copia URLs desde Tidal en el navegador.

---

## 4. Estado B — URL de Tidal Detectada

**Contexto:** El usuario pegó una URL de Tidal (álbum, track o playlist). El sistema la detectó al hacer `onPaste` o al hacer submit. En lugar de mostrar una grilla de resultados, muestra una preview card del item específico.

```
  SIDEBAR          CONTENT AREA
┌──────────────┐   ┌──────────────────────────────────────────────────────────────────────────┐
│▒▒▒▒▒▒▒▒▒▒▒▒▒│   │░                                                                        ░│
│▒ ■ MUSIC   ▒│   │░ ┌══════════════════════════════════════════════════════════════════════┐ ░│
│▒   4 ALL   ▒│   │░ ║  [A] tidal.com/browse/album/230509486                               ║ ░│
│▒           ▒│   │░ ║                                                      ⌕ Search   ⌘K  ║ ░│
│▒ ─────── ▒ │   │░ └══════════════════════════════════════════════════════════════════════┘ ░│
│▒●Dashboard ▒│   │░                                                                        ░│
│▒ Library   ▒│   │░  [B]                                                                   ░│
│▒ Downloads ▒│   │░  URL detected — Album                                                  ░│
│▒ History   ▒│   │░  ┌──────────────────────────────────────────────────────────────────┐  ░│
│▒ Settings  ▒│   │░  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ░│
│▒           ▒│   │░  │▓  ┌────────┐  [C]  OK Computer                  [D] ╔══════════╗ │  ░│
│▒ ─────── ▒ │   │░  │▓  │        │       Radiohead                        ║ ↓ Download║ │  ░│
│▒ TIDAL     ▒│   │░  │▓  │ COVER  │       1997 · EMI Records              ╚══════════╝ │  ░│
│▒ ● HiFi    ▒│   │░  │▓  │        │       10 tracks · 42:31                             │  ░│
└──────────────┘   │░  │▓  │        │  [E]  ┌──────┐ ┌────────┐ ┌──────────────────────┐│  ░│
                   │░  │▓  └────────┘       │FLAC  │ │ 24-BIT │ │ Master Quality (MQA) ││  ░│
  PLAYER BAR       │░  │▓  96×96px          └──────┘ └────────┘ └──────────────────────┘│  ░│
┌─────────────────────  │▓                                                               │  ░│
│░ ⊘ Nothing playing   │▓  [F]  # · TITLE                       DURATION  ·  QUAL      │  ░│
└─────────────────────  │▓  ── · ──────────────────────────────────────── ·  ──────     │  ░│
                   │░  │▓  01 · Airbag                           4:44      ·  FLAC      │  ░│
                   │░  │▓  02 · Paranoid Android                 6:23      ·  FLAC      │  ░│
                   │░  │▓  03 · Subterranean Homesick Alien      4:27      ·  FLAC      │  ░│
                   │░  │▓  04 · Exit Music (For a Film)          4:24      ·  FLAC      │  ░│
                   │░  │▓  05 · Let Down                         4:59      ·  FLAC      │  ░│
                   │░  │▓  06 · Karma Police                     4:21      ·  FLAC      │  ░│
                   │░  │▓  ~~  + 4 more tracks                                          │  ░│
                   │░  └──────────────────────────────────────────────────────────────────┘  ░│
                   │░                                                                        ░│
                   └──────────────────────────────────────────────────────────────────────────┘
```

### Anotaciones del Estado B

**[A] — Input con URL activa (borde teal)**  
El input muestra el borde teal `border-focus` activado inmediatamente al detectar la URL. No espera a que el usuario haga submit. La detección ocurre en el evento `onPaste` y en el `onChange` con debounce de 300ms (para no procesar cada caracter). El URL se muestra completo en el input, truncado con `text-overflow: ellipsis` si excede el ancho.

**[B] — Label de tipo detectado**  
Texto "URL detected — Album" en Geist Mono `text-xs`, `teal-500`. Aparece 200ms después de la detección con fade-in. El tipo puede ser: Album, Track, Playlist. Cambia según el path de la URL.

**[C] — Preview Card del item**  
Card `surface-console`, borde `border-default`, `radius-md`. Ancho completo del área de contenido. Internamente:
- Artwork: 96×96px, `radius-md`, sin filtros. Mientras carga: skeleton `surface-rack`.
- Título: Inter `font-semibold`, `text-heading`, `text-primary`
- Artista: Inter `font-normal`, `text-sm`, `text-secondary`
- Metadatos: Año · Sello · N tracks · Duración — Inter `text-sm`, `text-secondary`

**[D] — Botón Download (primary, full width del lado derecho)**  
Variante `primary`, tamaño `lg`. Fondo `teal-500`. Texto "↓ Download" en Inter `font-medium`. Es el único botón `primary` visible en la pantalla en este momento. Ocupa la columna derecha de la preview card. Al hacer hover: `teal-400`, `glow-active` sutil.

**[E] — Badges de calidad disponible**  
Tres badges: formato (FLAC), bit depth (24-BIT), y etiqueta de calidad (Master Quality / HiRes). Geist Mono `text-2xs`, mayúsculas. El badge de calidad más alta tiene borde `teal-500` y texto `teal-300` (variante `quality`). Los otros son variante `format`. Posición: bajo los metadatos del álbum.

**[F] — Lista de tracks del álbum**  
Previsualizando las primeras 6 pistas con: número de pista (Geist Mono `text-xs`, `text-disabled`), título (Inter `font-medium`, `text-base`), duración (Geist Mono `text-xs`, `text-secondary`), calidad por pista (badge `format`, `text-2xs`). La lista es solo lectura aquí — no tiene controles de selección individual. Al hacer clic en "Download" se descarga el álbum completo. Para descarga selectiva existe la vista de Library.

### Justificaciones UX del Estado B

**¿Por qué mostrar la preview card inmediatamente en lugar de pedir confirmación?**  
El usuario pegó una URL porque sabe qué quiere. La preview elimina la ansiedad del "¿lo detectó bien?". Ver el artwork, el título y los tracks confirma visualmente que la URL es correcta antes de iniciar la descarga. Es el equivalente al "preview" de un archivo antes de abrirlo.

**¿Por qué mostrar la lista de tracks en la preview?**  
El audiófilo verifica el contenido antes de descargar. Ver los títulos confirma que es la edición correcta (existe "OK Computer OKNOTOK", la edición de 2017, además de la original de 1997). Esta información evita una descarga errónea y una búsqueda posterior. El poder user técnico aprecia la transparencia de datos.

**¿Por qué los badges de calidad son tan prominentes?**  
La calidad de audio es el valor principal de la app y la razón de ser de la descarga. El usuario está descargando FLAC precisamente porque le importa. Mostrar "Master Quality · 24-bit · FLAC" de forma visible confirma que obtendrá lo que espera. Es el equivalente al "1080p" visible en un descargador de video.

**¿Por qué el botón Download está a la derecha, no centrado?**  
La preview card tiene un layout de dos columnas: izquierda (artwork + metadatos) y derecha (CTA). Este patrón es el de una ficha de producto: la información a la izquierda, la acción a la derecha. El usuario escanea de izquierda a derecha, confirma los datos y llega al botón naturalmente.

---

## 5. Estado C — Resultados de Búsqueda (Vista Grid)

**Contexto:** El usuario escribió texto (no URL) y presionó Enter. Se muestran resultados de álbumes, tracks y playlists organizados en tabs y en grid de cards.

```
  SIDEBAR          CONTENT AREA
┌──────────────┐   ┌──────────────────────────────────────────────────────────────────────────┐
│▒▒▒▒▒▒▒▒▒▒▒▒▒│   │░                                                                        ░│
│▒ ■ MUSIC   ▒│   │░  ┌────────────────────────────────────────────────────────────────────┐ ░│
│▒   4 ALL   ▒│   │░  │  Radiohead OK Computer                              ⌕ Search  ⌘K  │ ░│
│▒           ▒│   │░  └────────────────────────────────────────────────────────────────────┘ ░│
│▒ ─────── ▒ │   │░                                                                        ░│
│▒●Dashboard ▒│   │░  [A]  Albums (8)        Tracks (23)        Playlists (4)   [B] ≡ ⊞   ░│
│▒ Library   ▒│   │░  ════════════                                                          ░│
│▒ Downloads ▒│   │░                                                                        ░│
│▒ History   ▒│   │░  [C]                                                                   ░│
│▒ Settings  ▒│   │░  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ ░│
│▒           ▒│   │░  │▓▓▓▓▓▓▓▓▓▓│  │▓▓▓▓▓▓▓▓▓▓│  │▓▓▓▓▓▓▓▓▓▓│  │▓▓▓▓▓▓▓▓▓▓│  │▓▓▓▓▓▓▓▓▓▓│ ░│
│▒ ─────── ▒ │   │░  │▓         ▓│  │▓         ▓│  │▓         ▓│  │▓         ▓│  │▓         ▓│ ░│
│▒ TIDAL     ▒│   │░  │▓ ARTWORK ▓│  │▓ ARTWORK ▓│  │▓ ARTWORK ▓│  │▓ ARTWORK ▓│  │▓ ARTWORK ▓│ ░│
│▒ ● HiFi    ▒│   │░  │▓  [D]   ▓│  │▓         ▓│  │▓         ▓│  │▓         ▓│  │▓         ▓│ ░│
└──────────────┘   │░  │▓         ▓│  │▓         ▓│  │▓         ▓│  │▓         ▓│  │▓         ▓│ ░│
                   │░  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤ ░│
  PLAYER BAR       │░  │ OK Compu…│  │ Pablo Ho…│  │ The Bend…│  │ Amnesiac │  │ Kid A    │ ░│
┌─────────────────  │░  │ Radiohead│  │ Radiohead│  │ Radiohead│  │ Radiohead│  │ Radiohead│ ░│
│░ ⊘ Nothing play  │░  │[E] FLAC 24bit        │  │ FLAC 16bit│  │ FLAC 24bit│  │ FLAC 24bit│ ░│
└─────────────────  └─  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘ ░│
                   ┌─                                                                        ─┐
                   │░  ┌──────────┐  ┌──────────┐  ┌──────────┐                             ░│
                   │░  │▓▓▓▓▓▓▓▓▓▓│  │▓▓▓▓▓▓▓▓▓▓│  │▓▓▓▓▓▓▓▓▓▓│                             ░│
                   │░  │▓         ▓│  │▓         ▓│  │▓         ▓│                             ░│
                   │░  │▓ ARTWORK ▓│  │▓ ARTWORK ▓│  │▓ ARTWORK ▓│                             ░│
                   │░  │▓         ▓│  │▓         ▓│  │▓         ▓│                             ░│
                   │░  │▓         ▓│  │▓         ▓│  │▓         ▓│                             ░│
                   │░  ├──────────┤  ├──────────┤  ├──────────┤                             ░│
                   │░  │ Hail to…│  │ In Rainbow│  │ A Moon S…│                             ░│
                   │░  │ Radiohead│  │ Radiohead│  │ Radiohead│                             ░│
                   │░  │ FLAC 16bit│  │ FLAC 24bit│  │ FLAC 24bit│                             ░│
                   │░  └──────────┘  └──────────┘  └──────────┘                             ░│
                   │░                                                                        ░│
                   └──────────────────────────────────────────────────────────────────────────┘
```

#### Estado Hover sobre un Album Card

```
  ┌──────────────────────────────────────┐
  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
  │▓                                    ▓│  [F]
  │▓         ░░░░░░░░░░░░               ▓│  overlay rgba(0,0,0,0.45)
  │▓         ░   ↓ [G]  ░               ▓│  aparece en hover
  │▓         ░  Download░               ▓│
  │▓         ░░░░░░░░░░░░               ░│
  │▓                                    ▓│
  ├────────────────────────────────────── │
  │ OK Computer            [H] ⋯         │  botón de opciones aparece en hover
  │ Radiohead                            │
  │ FLAC 24bit                           │
  └──────────────────────────────────────┘
```

### Anotaciones del Estado C

**[A] — Tabs de tipo de resultado**  
`underline` variant del componente Tabs. Tabs: "Albums (8)", "Tracks (23)", "Playlists (4)". El número en paréntesis es el count de resultados de esa categoría. Tab activa: `text-primary`, indicador 2px `teal-500`. La app recuerda el último tab activo entre búsquedas de la misma sesión.

**[B] — Toggle de vista Grid/List**  
Dos botones `icon-only ghost` juntos. ⊞ = grid, ≡ = lista. El activo tiene fondo `surface-rack`. Posición: trailing en la misma línea de las tabs. La preferencia se persiste en `settings.store.ts` con localStorage.

**[C] — Grid de Album Cards**  
`repeat(auto-fill, minmax(180px, 1fr))` con `gap-4` (16px). En 1160px de ancho, caben exactamente 5 columnas con cards de 210px. El grid es responsive: en ventanas más estrechas reduce a 4, 3, 2 columnas sin breakpoints forzados.

**[D] — Album Card**  
Estructura: artwork en `aspect-ratio: 1/1`, `radius-md`. Info section debajo con `padding: 12px`. Título: Inter `font-semibold`, `text-sm`, `text-primary`, max 2 líneas con `line-clamp-2`. Artista: Inter `font-normal`, `text-xs`, `text-secondary`. Calidad: Geist Mono `text-2xs`, `text-disabled`.

**[E] — Badge de calidad en la card**  
El badge FLAC/calidad aparece en la tercera línea de la card info. Es puramente informativo en este contexto. No hay badge de "disponible" vs "no disponible" — si aparece en los resultados, está disponible para descargar.

**[F] — Overlay de hover en artwork**  
`rgba(0,0,0,0.45)` sobre el artwork, `radius-md`. Aparece con transición `opacity 150ms ease-out`. Centrado en el overlay: icono ↓ de Lucide (24px, `text-primary`) + texto "Download" en Inter `font-medium`, `text-sm`. Toda la card es clickeable: clic en el artwork abre el panel de detalle (Estado D). El botón centrado de "Download" en el overlay inicia la descarga directamente sin pasar por el detalle.

**[G] — Acción rápida de descarga desde overlay**  
Clic en el overlay "↓ Download": inicia la descarga del álbum completo con la calidad configurada en Settings. Muestra un toast "Download started" + la barra de progreso aparece en el panel de Downloads (visible si el usuario navega ahí, o mediante un badge en el nav item de Downloads).

**[H] — Menú contextual de la card**  
Botón `icon-only ghost` ⋯ (3 dots). Aparece solo en hover sobre la card. Clic abre un Popover (no un dropdown de 3 niveles) con opciones: "Download Album", "Download Tracks individually", "View on Tidal ↗", "Copy URL". El menú tiene `radius-lg`, `surface-studio`, `shadow-md`.

### Justificaciones UX del Estado C

**¿Por qué tabs de tipo en lugar de filtros laterales?**  
Los resultados tienen tipos fundamentalmente distintos (álbum ≠ track ≠ playlist). Los filtros laterales servirían para refinar dentro de un tipo (año, sello, formato). Las tabs separan tipos con jerarquía clara. El usuario sabe inmediatamente cuántos resultados hay de cada tipo con los counts en los tabs.

**¿Por qué la acción "Download" directamente desde el hover del artwork, sin pasar por el detalle?**  
El audiófilo que busca "Radiohead OK Computer" no necesita ver la vista de detalle para confirmar que quiere descargarlo. La acción rápida respeta su tiempo e inteligencia. La vista de detalle existe para cuando necesita verificar tracks individuales, edición específica, o metadatos extendidos.

**¿Por qué `auto-fill` en lugar de un número fijo de columnas?**  
La app puede ejecutarse en ventanas de distintos tamaños. `auto-fill` garantiza que el grid siempre use el espacio disponible óptimamente sin que el desarrollador defina breakpoints manuales. Las cards nunca son demasiado anchas ni demasiado estrechas.

---

## 6. Estado D — Álbum Seleccionado (Panel de Detalle)

**Contexto:** El usuario hizo clic en una album card (no en el overlay de descarga rápida). Se abre un panel lateral deslizable desde la derecha con el detalle completo del álbum.

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
│▒ ─────── ▒│░              ↑                ░│█  1997 · EMI Records · Parlophone       █│
│▒ TIDAL    │░        cards oscurecidas      ░│█  10 tracks · 42:31                     █│
│▒ ● HiFi   │░        overlay rgba(0,0,0,.4) ░│█  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ █│
└────────────┘░                               ░│█  [D] ┌──────┐ ┌────────┐ ┌─────────┐  █│
               ░                               ░│█      │FLAC  │ │ 24-BIT │ │  MQA    │  █│
  PLAYER BAR   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│█      └──────┘ └────────┘ └─────────┘  █│
┌───────────────────────────────────────────── │█                                         █│
│░ ⊘ Nothing playing                           │█  [E] ╔════════════════════════════════╗ █│
└───────────────────────────────────────────── │█      ║  ↓  Download Album (10 tracks)  ║ █│
                                               │█      ╚════════════════════════════════╝ █│
                                               │█                                         █│
                                               │█  [F] Tracks                             █│
                                               │█  ────────────────────────────────────  █│
                                               │█  01  Airbag                  4:44 FLAC  █│
                                               │█  02  Paranoid Android        6:23 FLAC  █│
                                               │█  03  Subterranean Hom…       4:27 FLAC  █│
                                               │█  04  Exit Music (For a Film) 4:24 FLAC  █│
                                               │█  05  Let Down                4:59 FLAC  █│
                                               │█  06  Karma Police            4:21 FLAC  █│
                                               │█  07  Electioneering          3:50 FLAC  █│
                                               │█  08  Climbing Up the Walls   4:45 FLAC  █│
                                               │█  09  No Surprises            3:48 FLAC  █│
                                               │█  10  The Tourist             5:24 FLAC  █│
                                               │█                                         █│
                                               │█  [G] METADATA                          █│
                                               │█  ────────────────────────────────────  █│
                                               │█  UPC    ·  075678245022               █│
                                               │█  Label  ·  EMI Records Ltd.           █│
                                               │█  Genre  ·  Alternative Rock           █│
                                               │█  ISRC   ·  GB-EMI-97-01234  (track 1) █│
                                               └──────────────────────────────────────────┘
```

### Anotaciones del Estado D

**[A] — Botón de cierre del panel**  
✕ Lucide `X` icon, `icon-only ghost`, posición `top-right`. También se cierra con `Escape` y con clic en el overlay oscurecido del grid. El panel se cierra con animación `translateX(0 → 100%)` en `250ms ease-in`.

**[B] — Artwork grande**  
200×200px, `radius-md` (4px). Sin filtros. Si no hay artwork disponible: fondo `surface-rack` con icono de música centrado (`text-disabled`, 32px). El artwork no es clickeable en este contexto.

**[C] — Título y metadatos del álbum**  
Título: Geist Mono `font-bold`, `text-lg`, `text-primary`. Artista: Inter `font-semibold`, `text-base`, `text-secondary`. Línea de metadatos: Inter `text-sm`, `text-secondary`. Separadores con `·`. El sello discográfico es texto literal del metadata de Tidal.

**[D] — Badges de calidad máxima disponible**  
Mismo sistema de badges que en Estado B. Aquí son más prominentes porque el panel tiene espacio vertical.

**[E] — CTA principal: Download Album**  
Full width del panel. Variante `primary`, tamaño `lg`. "↓ Download Album (10 tracks)". El número de tracks en el label confirma lo que se va a descargar. Al hacer clic: inicia la descarga, cierra el panel, muestra toast "Download started".

**[F] — Lista completa de tracks**  
Scroll interno si los tracks exceden el área visible. Cada fila: número (Geist Mono `text-xs`, `text-disabled`), título (Inter `font-medium`, `text-sm`), duración (Geist Mono `text-xs`, `text-secondary`), badge FLAC (`text-2xs`). Hover sobre una fila: fondo `surface-rack` + aparece un botón "↓" trailing para descargar esa pista individual.

**[G] — Sección de Metadatos extendidos**  
UPC, Label, Genre, ISRC (del primer track). JetBrains Mono para los valores de código. Etiquetas en Inter `text-xs`, `text-secondary`. Separador `·` entre label y valor. Esta sección satisface al audiófilo coleccionista que verifica que los metadatos son correctos antes de descargar.

### Justificaciones UX del Estado D

**¿Por qué un panel lateral y no una página nueva?**  
El panel preserva el contexto de búsqueda. Si el usuario abre el detalle de "OK Computer" y no era el que quería, puede cerrarlo y ver los otros resultados del grid sin perder la búsqueda. La navegación a una nueva página implicaría usar el botón "back" del navegador, rompiendo el flujo de descubrimiento.

**¿Por qué el panel tiene 420px y no es full-width?**  
420px es suficiente para mostrar el artwork 200×200px, los metadatos y la lista de tracks con comodidad. Mantener la mitad izquierda del contenido visible refuerza el contexto: el usuario sabe dónde está en la búsqueda. Full-width (modal) sería apropiado para la vista de Library, donde el detalle es el foco principal.

**¿Por qué los metadatos extendidos (UPC, ISRC) están visibles directamente y no en un "Ver más"?**  
El Principio 5 del Brand Identity: "Precisión sobre Perfección Visual. Si un metadato existe, se muestra." El público objetivo son coleccionistas y audiófilos que usan estos campos para verificar ediciones. Ocultarlos detrás de un accordion sería condescendiente.

---

## 7. Estado E — Descarga Activa (Single Job)

**Contexto:** El usuario inició una descarga de un álbum. Está en el Dashboard. El panel de descarga aparece en la parte inferior del content area, sobre el player bar.

```
  SIDEBAR          CONTENT AREA
┌──────────────┐   ┌──────────────────────────────────────────────────────────────────────────┐
│▒▒▒▒▒▒▒▒▒▒▒▒▒│   │░                                                                        ░│
│▒ ■ MUSIC   ▒│   │░  ┌────────────────────────────────────────────────────────────────────┐ ░│
│▒   4 ALL   ▒│   │░  │  Radiohead OK Computer                              ⌕ Search  ⌘K  │ ░│
│▒           ▒│   │░  └────────────────────────────────────────────────────────────────────┘ ░│
│▒ ─────── ▒ │   │░                                                                        ░│
│▒●Dashboard ▒│   │░  Albums (8)        Tracks (23)        Playlists (4)         ≡ ⊞       ░│
│▒ Library   ▒│   │░  ════════════                                                          ░│
│▒ Downloads [A]  │░                                                                        ░│
│▒    ①      ▒│   │░  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              ░│
│▒ History   ▒│   │░  │▓▓▓▓▓▓▓▓▓▓│  │▓▓▓▓▓▓▓▓▓▓│  │▓▓▓▓▓▓▓▓▓▓│  │▓▓▓▓▓▓▓▓▓▓│              ░│
│▒ Settings  ▒│   │░  │▓ ARTWORK ▓│  │▓ ARTWORK ▓│  │▓ ARTWORK ▓│  │▓ ARTWORK ▓│              ░│
│▒           ▒│   │░  │▓         ▓│  │▓         ▓│  │▓         ▓│  │▓         ▓│              ░│
│▒ ─────── ▒ │   │░  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤              ░│
│▒ TIDAL     ▒│   │░  │ OK Compu…│  │ Pablo Ho…│  │ The Bend…│  │ Amnesiac │              ░│
│▒ ● HiFi    ▒│   │░  │ Radiohead│  │ Radiohead│  │ Radiohead│  │ Radiohead│              ░│
└──────────────┘   │░  │ FLAC 24bit│  │ FLAC 16bit│  │ FLAC 24bit│  │ FLAC 24bit│              ░│
                   │░  └──────────┘  └──────────┘  └──────────┘  └──────────┘              ░│
  PLAYER BAR       │░                                                                        ░│
┌─────────────────  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│                   │                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────────┐  │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  │
│  │▓  [B]  ● Downloading  OK Computer — Radiohead            [C]  3.2 MB/s  ▓▓  1:45 ETA│  │
│  │▓  [D]  Airbag.flac                                                  3 / 10 tracks   ▓│  │
│  │▓  [E]  ┌──────────────────────────────────────────────────────────────┐   [F] ✕ Pause│  │
│  │▓       │███████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│              ▓│  │
│  │▓       └──────────────────────────────────────────────────────────────┘              ▓│  │
│  │▓       32%                                                                           ▓│  │
│  └──────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                            │
│   PLAYER BAR PERMANENTE                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│  │░░  ⊘ Nothing playing  ··  Browse library to start playing                      ░░░│   │
│  └─────────────────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Anotaciones del Estado E

**[A] — Badge de contador en nav item "Downloads"**  
Número en badge circular (`radius-full`, 16px diámetro, `semantic-info` background, texto blanco Geist Mono `text-2xs`). Muestra el número de jobs activos. Aparece con fade-in cuando hay al menos un job. Desaparece cuando todos los jobs terminan o son removidos. Solo aparece en el nav item de Downloads, no en el app icon (no es una notificación push).

**[B] — Panel de descarga activa (sticky inline)**  
El panel aparece en la zona inferior del content area, sobre el player bar. Fondo `surface-console`, borde `border-default`, sin `radius` en los bordes que toca los bordes del área (`radius-md` solo en los bordes internos visibles). La primera línea muestra: dot animado ● (rotación de `glow-download` al ritmo de 2s) + "Downloading" en Geist Mono `text-xs` `semantic-info` + nombre del álbum + artista en Inter `text-sm`.

**[C] — Métricas en tiempo real**  
Geist Mono `text-xs`, `text-secondary`. Velocidad de descarga (MB/s) a la derecha, ETA (tiempo restante formateado como "1:45") separado por espacio. Ambos valores se actualizan cada segundo vía WebSocket. Si la velocidad es 0 (pausado), muestra "—" en lugar del número.

**[D] — Nombre del track actual**  
El track que se está descargando actualmente. Inter `text-xs`, `text-disabled`. Formato: `{nombre_archivo}.flac`. Cambia con cada track completado. A la derecha: contador "3 / 10 tracks".

**[E] — Progress Bar del álbum completo**  
Variante `download`, tamaño `md` (4px de altura). Color de fill: `semantic-info`. Sin `radius` (rectangular). Porcentaje bajo la barra: Geist Mono `text-xs`, `text-disabled`. El porcentaje es del álbum completo (tracks completados / total), no del track individual.

**[F] — Acciones del job**  
Dos botones `icon-only ghost`, `sm` size: Pause (icono ⏸) y Cancel (✕). Pause cambia el ícono a ▶ cuando está pausado. Cancel abre un Popover de confirmación pequeño: "Cancel download? Files downloaded so far are kept." Con botones "Keep Downloading" (primary) y "Cancel" (ghost danger). La confirmación es necesaria aquí porque es una acción parcialmente destructiva.

### Justificaciones UX del Estado E

**¿Por qué el panel de descarga es inline en el content area y no un overlay flotante?**  
Un overlay flotante (toast permanente) compite con el contenido y causa ansiedad (el usuario siente que "algo está pasando y no puede controlarlo"). El panel inline es predecible: el usuario sabe exactamente dónde mirar el progreso. Además, no bloquea la búsqueda — el usuario puede seguir explorando mientras descarga.

**¿Por qué mostrar el track actual y no solo el porcentaje total?**  
El track actual da granularidad. Si la descarga de un track falla y se salta, el usuario lo verá. Si el nombre del track es incorrecto en los metadatos, lo verá aquí. Es información de monitoreo técnico, alineada con el Principio P5 (Precisión sobre Perfección Visual).

**¿Por qué el ETA en lugar del tiempo transcurrido?**  
El usuario no necesita saber cuánto tiempo lleva — necesita saber cuándo termina. El ETA es la información accionable: le dice si tiene tiempo para ir a buscar café o si debe esperar frente a la pantalla. El tiempo transcurrido es información de sistema, no de usuario.

---

## 8. Estado F — Cola Múltiple de Descargas

**Contexto:** El usuario inició 3 descargas simultáneas. El panel de downloads se expande para mostrar todos los jobs.

```
                   ┌─  DOWNLOAD PANEL EXPANDIDO  (fijo sobre el player bar)  ─────────────────┐
                   │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
                   │▓  DOWNLOADS  [A] Active: 2  ·  Queue: 1  ·  Completed: 0     [B] ∧ ∧   ▓│
                   │▓  ──────────────────────────────────────────────────────────────────────  ▓│
                   │▓                                                                          ▓│
                   │▓  [C] ● OK Computer — Radiohead                        3.2 MB/s  1:45 ETA▓│
                   │▓  Karma Police.flac                                        7 / 10 tracks ▓│
                   │▓  ┌─────────────────────────────────────────────────────────────────┐    ▓│
                   │▓  │██████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ ✕ ⏸▓│
                   │▓  └─────────────────────────────────────────────────────────────────┘    ▓│
                   │▓  68%                                                                     ▓│
                   │▓                                                                          ▓│
                   │▓  [D] ● Pablo Honey — Radiohead                         1.8 MB/s  3:10 ETA▓│
                   │▓  Creep.flac                                               3 / 12 tracks  ▓│
                   │▓  ┌─────────────────────────────────────────────────────────────────┐    ▓│
                   │▓  │████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ ✕ ⏸▓│
                   │▓  └─────────────────────────────────────────────────────────────────┘    ▓│
                   │▓  23%                                                                     ▓│
                   │▓                                                                          ▓│
                   │▓  [E] ○ Amnesiac — Radiohead                                  IN QUEUE   ▓│
                   │▓  Waiting to start                                                        ▓│
                   │▓  ┌─────────────────────────────────────────────────────────────────┐    ▓│
                   │▓  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ ✕   ▓│
                   │▓  └─────────────────────────────────────────────────────────────────┘    ▓│
                   │▓                                                                          ▓│
                   └────────────────────────────────────────────────────────────────────────────┘
  PLAYER BAR       ┌────────────────────────────────────────────────────────────────────────────┐
┌───────────────── │░  ⊘ Nothing playing  ··  Browse library to start playing               ░░│
│                  └────────────────────────────────────────────────────────────────────────────┘
```

### Anotaciones del Estado F

**[A] — Header del panel de downloads**  
Texto "DOWNLOADS" en Geist Mono `text-xs` mayúsculas, `text-disabled`. A la derecha: "Active: 2 · Queue: 1 · Completed: 0" en Geist Mono `text-xs`, `text-secondary`. Los tres contadores se actualizan en tiempo real. Esta densidad informativa en una sola línea satisface al power user que necesita visión global del estado del sistema.

**[B] — Controles del panel**  
Dos botones: "Pause All" (icono ⏸) y "Cancel All" (icono ✕), ambos `icon-only ghost sm`. Al hacer hover muestran tooltips "Pause all downloads" y "Cancel all downloads". "Cancel All" abre un Popover de confirmación. A la izquierda de estos botones: un botón para colapsar el panel (∧).

**[C] y [D] — Jobs activos**  
Cada job activo muestra: dot ● animado `semantic-info`, nombre del álbum en Inter `font-medium` `text-sm`, artista en `text-secondary`, métricas (MB/s + ETA) a la derecha, nombre del track actual en `text-disabled`, contador de tracks, barra de progreso, porcentaje, y controles individuales (✕ y ⏸).

**[E] — Job en cola**  
Dot ○ (vacío) `text-disabled`, badge "IN QUEUE" en Geist Mono `text-2xs`, `semantic-queue`. Barra de progreso vacía (`surface-rack` sólido, sin fill). Sin métricas de velocidad (no ha empezado). Solo tiene el botón ✕ para remover de la cola.

### Justificaciones UX del Estado F

**¿Por qué el panel de downloads se muestra como área expandible y no redirige a la página de Downloads?**  
El usuario que inicia múltiples descargas quiere monitorearlas mientras sigue explorando. Redirigir a la página de Downloads interrumpe el flujo de descubrimiento. El panel inline permite ambas cosas simultáneamente, como la barra de progreso de una descarga de Chrome que no te impide seguir navegando.

**¿Por qué "Active: 2 · Queue: 1 · Completed: 0" en el header?**  
Esta línea es el equivalente al dashboard de un sistema de colas: el operador (usuario) necesita el estado global de un vistazo. Tres números en una línea. Sin gráficos, sin tarjetas innecesarias. Densidad con jerarquía.

---

## 9. Estado G — Error de Descarga

**Contexto:** Una descarga falló (error de red, error 403 de Tidal, archivo corrupto). El sistema debe comunicarlo con claridad y ofrecer una acción de recuperación.

```
                   │▓  ──────────────────────────────────────────────────────────────────────  ▓│
                   │▓                                                                          ▓│
                   │▓  [A] ✗ OK Computer — Radiohead                   [B] ↻ Retry  ✕ Remove  ▓│
                   │▓  [C]  Download failed — Tidal returned 403. Session may have expired.    ▓│
                   │▓  ┌─────────────────────────────────────────────────────────────────┐    ▓│
                   │▓  │████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│    ▓│
                   │▓  └─────────────────────────────────────────────────────────────────┘    ▓│
                   │▓  [D] 5 of 10 tracks completed before failure. Partial files saved.      ▓│
                   │▓                                                                          ▓│
```

```
  TOAST de error (simultáneo al panel)
  ┌──────────────────────────────────────────────────────────────────────────┐
  │█  [E]                                                                    │
  │█  ✗  Download failed                                           [F] ✕    │
  │█     Tidal returned 403: session expired.    [G] Check Session  ↻ Retry │
  └──────────────────────────────────────────────────────────────────────────┘
```

### Anotaciones del Estado G

**[A] — Indicador de error en el job**  
El dot ● animado se convierte en ✗ estático, color `semantic-error`. El nombre del álbum permanece pero en `text-secondary` (no primary — ya no es activo). El job no desaparece automáticamente.

**[B] — Acciones de recuperación**  
Dos botones en la misma fila: "↻ Retry" (variante `secondary`, borde `semantic-error`, texto `semantic-error`) y "✕ Remove" (`ghost`). Retry reinicia la descarga desde donde falló si es posible, o desde el principio si no. El orden es intencional: Retry primero (acción positiva), Remove después (acción de limpieza).

**[C] — Mensaje de error técnico**  
Inter `text-xs`, `semantic-error`. El mensaje incluye el código HTTP y una interpretación en lenguaje natural. No dice "An error occurred" — dice exactamente qué pasó y por qué puede haber ocurrido. El usuario técnico puede actuar en consecuencia (renovar sesión de Tidal).

**[D] — Estado de archivos parciales**  
Inter `text-xs`, `text-secondary`. Informa que los tracks descargados antes del fallo están guardados. Esto reduce la ansiedad y evita que el usuario cancele todo pensando que perdió el trabajo.

**[E] — Toast de error**  
Variante `error`, persiste hasta cierre manual. Posición `bottom-right`. Aparece simultáneamente con el error en el panel. El toast es la notificación "push" pasiva; el panel es el detalle persistente.

**[F] — Cierre manual del toast**  
El toast de error no hace auto-dismiss. Es la única información en el sistema que podría requerir acción del usuario (renovar sesión). Forzar la dismissal manual asegura que el usuario lo vea.

**[G] — CTA contextual en el toast**  
"Check Session" abre el modal de estado de conexión con Tidal. "↻ Retry" hace lo mismo que el Retry del panel. Los CTAs en el toast duplican las acciones del panel para que el usuario pueda actuar desde donde esté.

### Justificaciones UX del Estado G

**¿Por qué mostrar el error en dos lugares (panel + toast)?**  
El toast captura la atención inmediatamente (posición periférica, color rojo, aparece de forma animada). El panel provee el contexto completo y las acciones. Son canales complementarios: el toast dice "algo falló", el panel dice "exactamente qué y qué puedes hacer".

**¿Por qué el mensaje de error incluye el código HTTP (403)?**  
El público terciario (power user técnico) necesita el código para diagnosticar. El mensaje en lenguaje natural ayuda al público primario (audiófilo). Ambos coexisten en el mismo mensaje sin redundancia.

---

## 10. Componente: Sidebar — Todos Sus Estados

```
  ┌────────────────────────────┐
  │ ESTADO: NORMAL AUTENTICADO │
  │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
  │▒  ■ MUSIC 4 ALL           ▒│  ← Geist Mono 700, teal-500, 56px height
  │▒                          ▒│
  │▒  ─────────────────────── ▒│  ← border-subtle, 1px
  │▒                          ▒│
  │▒  ⊞  Dashboard            ▒│  ← icono 16px + Inter text-sm
  │▒  ▤  Library              ▒│    text-secondary en reposo
  │▒  ↓  Downloads       ①   ▒│    badge de count cuando hay jobs activos
  │▒  ◷  History              ▒│
  │▒  ◉  Settings             ▒│
  │▒                          ▒│
  │▒  ─────────────────────── ▒│
  │▒                          ▒│
  │▒  ● TIDAL HiFi            ▒│  ← dot 6px semantic-success + Geist Mono text-2xs
  │▒  picassoivan931@gmail.com▒│  ← Inter text-xs, text-disabled
  │▒  [A] Sign out            ▒│  ← ghost button sm, text-disabled
  └────────────────────────────┘

  ┌────────────────────────────┐
  │ ESTADO: ÍTEM ACTIVO        │
  │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
  │▒  ██ Dashboard            ▒│  ← fondo surface-rack + borde izq 2px teal-500
  │                            │    icono teal-500, texto text-primary font-medium
  └────────────────────────────┘

  ┌────────────────────────────┐
  │ ESTADO: TIDAL DESCONECTADO │
  │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
  │▒  ○ TIDAL — Disconnected  ▒│  ← dot semantic-error, texto semantic-error
  │▒  [B] Reconnect           ▒│  ← button secondary sm, ocupa todo el ancho del sidebar
  └────────────────────────────┘

  ┌────────────────────────────┐
  │ ESTADO: RECONECTANDO       │
  │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
  │▒  ◌ Reconnecting...       ▒│  ← dot rotando (spin 2s linear), texto text-secondary
  └────────────────────────────┘
```

**[A] — Sign out**  
Ghost button pequeño. Clic abre Popover de confirmación de 1 paso: "Sign out of Tidal?" con botones "Cancel" y "Sign out" (danger). No requiere confirmación adicional después del popover.

**[B] — Reconnect**  
Button secondary sm, full width. Reinicia el flujo de Device Auth de Tidal (abre la URL de verificación en el navegador). La firma del email debajo del estado de conexión ayuda al usuario a saber a qué cuenta está (o estaba) conectado.

### Justificaciones UX del Sidebar

**¿Por qué el email del usuario aparece al fondo del sidebar y no en un avatar/header?**  
La app es personal (un usuario a la vez, sin multi-cuenta). El email es información de contexto ("¿con cuál cuenta de Tidal estoy?"), no de identidad prominente. Ponerlo al fondo del sidebar, pequeño y discreto, preserva la jerarquía: lo importante es la música, no el perfil.

**¿Por qué el estado de conexión Tidal cambia el sidebar entero y no solo un ícono?**  
Una desconexión de Tidal es un error crítico que bloquea la funcionalidad principal de la app. Merece visibilidad. El sidebar es visible en todas las páginas, así que el cambio de estado es inmediato y no requiere que el usuario navegue a ningún lugar para enterarse.

---

## 11. Componente: Player Bar — Todos Sus Estados

```
  ┌──────────────────────────────────────────────────────────────────────────────────────────┐
  │ ESTADO: SIN PISTA ACTIVA                                                    80px height │
  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
  │░  ⊘  Nothing playing                                                                  ░│
  │░  ~~  Use search above or browse your library                                          ░│
  └──────────────────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────────────────────────┐
  │ ESTADO: REPRODUCIENDO                                                                    │
  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
  │░                                                                                        ░│
  │░  [A]          [B]                         [C]                     [D]        [E]       ░│
  │░  ┌────┐  ● Paranoid Android          ◄◄  ▐▐  ▶▶          ──────●────     Vol: ████▓░  ░│
  │░  │    │    Radiohead · OK Computer   ←─────────── 3:25 / 6:23 ──────→                 ░│
  │░  └────┘  ♥  [F]                                                                       ░│
  │░                                                                                        ░│
  └──────────────────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────────────────────────┐
  │ ESTADO: PAUSADO                                                                          │
  │░  ┌────┐  ○ Paranoid Android    ◄◄  ▶  ▶▶         ──────●────    Vol: ████▓░           ░│
  │░  │    │    Radiohead · OK Computer                 3:25 / 6:23                         ░│
  │░  └────┘  ♥                                                                             ░│
  └──────────────────────────────────────────────────────────────────────────────────────────┘
```

**[A] — Artwork de la pista actual**  
48×48px, `radius-sm` (2px). Sin filtros. Clic en el artwork abre el panel de detalle del álbum (Estado D equivalente pero desde el player).

**[B] — Info de la pista**  
Dos líneas. Línea 1: dot ● `teal-500` + nombre de la pista en Inter `font-medium` `text-sm` `text-primary` con `glow-text-active` muy sutil. Línea 2: Artista · Álbum en Inter `text-xs` `text-secondary`. Bajo: ícono ♥ para guardar en favoritos (futuro).

**[C] — Controles de reproducción**  
Centrados en el player bar. ◄◄ (prev), ▐▐ o ▶ (play/pause toggle), ▶▶ (next). Íconos Lucide 20px. El activo (play/pause) es el único con `teal-500` en estado activo. Los otros dos son `text-secondary` en reposo, `text-primary` en hover.

**[D] — Slider de progreso**  
Fader horizontal. Track `surface-rack` 4px alto. Fill `teal-500`. Thumb: rectángulo 2px × 12px, `teal-500` (estilo "fader de consola", no círculo). El tiempo se muestra en Geist Mono `text-xs` `text-secondary` a la derecha del slider: "3:25 / 6:23". El slider es arrastrable.

**[E] — Control de volumen**  
Fader horizontal 80px. Mismo estilo que el slider de progreso. Etiqueta "Vol:" en Geist Mono `text-2xs` `text-disabled`. Fill `teal-700` en reposo (más oscuro que el slider de progreso para diferenciarlos visualmente).

### Justificaciones UX del Player Bar

**¿Por qué el estado "sin pista activa" muestra texto de guía en lugar de ser invisible?**  
Un player bar vacío genera desconcierto: "¿está disponible esto?", "¿está roto?". El texto de guía confirma que el reproductor existe y explica cómo activarlo. El ícono ⊘ comunica "vacío intencional", no error.

**¿Por qué el thumb del slider es rectangular y no circular?**  
El Brand Identity especifica: "Sliders de audio con thumb estilo fader de consola". Un thumb rectangular (2px×12px) es la representación directa de un fader físico en una consola de mezcla. Es la diferencia entre un reproductor genérico y un reproductor con ADN de estudio de grabación.

**¿Por qué los tiempos están al lado del slider y no separados?**  
El usuario necesita los tiempos para operar el slider. Si los tiempos están lejos del slider, el ojo tiene que viajar para correlacionarlos. La proximidad elimina ese movimiento ocular. Es un principio básico de ergonomía visual.

---

## 12. Flujo de Interacción Completo

Este diagrama muestra la secuencia de estados del Dashboard y las transiciones entre ellos.

```
  LOGIN
    │
    ▼ (autenticación exitosa)
  ┌──────────────────┐
  │  ESTADO A        │ ◄──────────────────────────────────────────┐
  │  Empty State     │                                            │
  │  (foco en input) │                                            │
  └──────────────────┘                                            │
         │                                                        │
         ├──── usuario pega URL ──────────────────────►  ESTADO B │
         │     (onPaste detectado)                    URL Preview  │
         │                                                │        │
         │                                               │ clic ✕  │
         ├──── usuario escribe + Enter ─────────────►  ESTADO C ──┘
         │     (text search)                         Grid Results
         │                                                │
         │                                       clic en artwork card
         │                                                │
         │                                               ▼
         │                                          ESTADO D
         │                                       Detail Panel
         │                                          │
         │                                          │ clic "Download"
         │                                          │
         │◄─────────────────────────────────────────┘
         │         (panel se cierra, toast aparece)
         │
         ▼ (download iniciado)
  ┌──────────────────┐
  │  ESTADO E        │
  │  Active Download │
  │  (1 job)         │
  └──────────────────┘
         │
         ├──── usuario descarga otro álbum ──────►  ESTADO F
         │                                         Multiple Jobs
         │
         ├──── error en la descarga ─────────────►  ESTADO G
         │                                         Error State
         │                                            │
         │                                           "Retry"
         │◄───────────────────────────────────────────┘
         │
         │ todos los jobs completados
         │
         ▼
  ┌──────────────────┐
  │  Panel Downloads │
  │  "Completed: N"  │
  │  Jobs desaparecen│
  │  después de 3s   │
  └──────────────────┘
         │
         ▼
  Regresa a ESTADO A o C (la búsqueda persiste en el input)
```

### Transiciones y Duraciones

| Transición | Animación | Duración |
|---|---|---|
| Empty State → URL Preview | Fade in de la preview card + slide up | 200ms ease-out |
| URL Preview → Grid Results | Cross-fade | 200ms ease-out |
| Grid → Detail Panel | Slide in desde derecha + overlay | 250ms ease-out |
| Detail Panel → cerrado | Slide out hacia derecha | 200ms ease-in |
| Job añadido al panel | Slide in + expand del panel | 300ms ease-out |
| Job completado | Barra de progreso → verde, fade out después de 3000ms | 300ms ease-in |
| Toast aparece | Slide in desde derecha + fade | 300ms ease-out |
| Toast desaparece (auto) | Slide out + fade | 200ms ease-in |

---

*Music 4 All — Dashboard Wireframes v1.0 · Junio 2026*  
*Siguiente paso: wireframes de Library view y Download Queue page.*
