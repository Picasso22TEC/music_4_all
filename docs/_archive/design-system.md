# Music 4 All — Design System

> Versión 1.0 · Junio 2026  
> Derivado de: `docs/brand-identity.md`  
> Stack: Next.js 14 · TypeScript · Tailwind CSS · Framer Motion

---

## Índice

1. [Design Tokens](#1-design-tokens)
   - 1.1 Colores
   - 1.2 Espaciados
   - 1.3 Radios de borde
   - 1.4 Sombras y Glow
   - 1.5 Z-Index
2. [Tipografía](#2-tipografía)
   - 2.1 Familias tipográficas
   - 2.2 Escala de tamaños
   - 2.3 Pesos
   - 2.4 Jerarquías semánticas
   - 2.5 Line-height y tracking
3. [Componentes Base](#3-componentes-base)
   - 3.1 Button
   - 3.2 Input
   - 3.3 Card
   - 3.4 Modal
   - 3.5 Toast
   - 3.6 Badge
   - 3.7 ProgressBar
   - 3.8 Tooltip
   - 3.9 Tabs
4. [Estados](#4-estados)
5. [Accesibilidad](#5-accesibilidad)

---

## 1. Design Tokens

Los tokens son la capa atómica del sistema. Cada decisión visual de la app debe poder rastrearse hasta uno de estos tokens. Ningún valor de color, espaciado o sombra debe existir fuera de este registro.

---

### 1.1 Colores

Los colores están organizados en cinco grupos semánticos. Ningún grupo puede mezclarse con otro salvo en los casos documentados explícitamente.

#### Grupo A — Superficies (Backgrounds)

El sistema usa cinco niveles de profundidad. El nivel más bajo (Void) es el más oscuro y es el fondo base de la aplicación. Cada nivel superior tiene más luminosidad para comunicar elevación.

| Token               | Alias        | Valor HEX | Uso principal                          |
|---------------------|--------------|-----------|----------------------------------------|
| `surface-void`      | `void`       | `#080B0F` | Fondo base de toda la aplicación       |
| `surface-abyss`     | `abyss`      | `#0D1117` | Fondo de sidebars y paneles fijos      |
| `surface-console`   | `console`    | `#131920` | Superficie de cards, dropdowns         |
| `surface-studio`    | `studio`     | `#1A2330` | Superficie elevada, modales            |
| `surface-rack`      | `rack`       | `#21303F` | Hover sobre card, elemento seleccionado|

**Regla de uso:** Las superficies solo suben de nivel por interacción o elevación física. Nunca usar `surface-rack` como fondo base de una sección.

#### Grupo B — Textos

| Token               | Valor HEX | Contraste sobre `surface-void` | Uso                        |
|---------------------|-----------|--------------------------------|----------------------------|
| `text-primary`      | `#E8EFF5` | 16.2:1 (WCAG AAA)              | Contenido principal        |
| `text-secondary`    | `#8FA3B8` | 6.8:1 (WCAG AA)                | Metadatos, etiquetas       |
| `text-disabled`     | `#4D6278` | 3.1:1 (solo decorativo)        | Estados inactivos          |
| `text-ghost`        | `#2C3E50` | 1.8:1 (solo decorativo)        | Placeholders               |

**Regla de uso:** `text-disabled` y `text-ghost` **nunca** se usan para texto funcional que el usuario deba leer. Solo para elementos decorativos o de estado inactivo.

#### Grupo C — Acento Principal (Teal Analógico)

| Token              | Valor HEX   | Uso                                   |
|--------------------|-------------|---------------------------------------|
| `teal-300`         | `#4DFFD9`   | Focus rings, active state de icono    |
| `teal-400`         | `#00E5BF`   | Hover sobre elemento con teal         |
| `teal-500`         | `#00C9A7`   | CTA principal, acento activo          |
| `teal-700`         | `#008C73`   | Pressed / estado pulsado              |
| `teal-glow`        | `#00C9A720` | Sombra semántica, glow layer          |

El `teal-500` es el único color que puede utilizarse en rellenos de botones primarios. Todos los demás tokens de teal son variaciones de estado.

#### Grupo D — Semántica de Estado

| Token              | Valor HEX | Estado que comunica                   |
|--------------------|-----------|---------------------------------------|
| `semantic-success` | `#39D353` | Completado, operación exitosa         |
| `semantic-warning` | `#E8A020` | Pausado, advertencia no bloqueante    |
| `semantic-error`   | `#E84040` | Error, operación fallida              |
| `semantic-info`    | `#3B82F6` | En progreso, descargando              |
| `semantic-queue`   | `#8B5CF6` | En cola, pendiente de inicio          |

Cada token semántico tiene tres roles fijos: como color de icono, como borde de componente en ese estado y como fondo de badge. No deben usarse para propósitos distintos a los documentados.

#### Grupo E — Bordes y Separadores

| Token                | Valor HEX   | Uso                                |
|----------------------|-------------|------------------------------------|
| `border-default`     | `#1E2D3D`   | Bordes de cards y componentes      |
| `border-subtle`      | `#162030`   | Divisores internos, separadores    |
| `border-focus`       | `#00C9A750` | Focus ring de inputs y botones     |
| `border-error`       | `#E8404050` | Borde de input en estado error     |

#### Grupo F — Synthwave (Uso Restringido)

| Token                | Valor HEX | Restricción                             |
|----------------------|-----------|-----------------------------------------|
| `synthwave-magenta`  | `#E040FB` | Máximo 1 aparición por vista            |
| `synthwave-blue`     | `#40C4FF` | Máximo 1 aparición por vista            |
| `synthwave-pink`     | `#FF4081` | Solo text highlight, nunca como relleno |

**Regla absoluta:** Los colores Synthwave nunca se combinan entre sí en la misma pantalla. Son mutuamente excluyentes por vista.

---

### 1.2 Espaciados

El sistema de espaciado usa **8px como unidad base** (1 rack unit = 1U = 8px), en referencia a la unidad de medida de racks de equipos de audio profesionales. Toda medida de espaciado es múltiplo de esta unidad.

| Token        | Valor | Múltiplo | Uso típico                                   |
|--------------|-------|----------|----------------------------------------------|
| `space-0`    | 0px   | 0U       | Sin espaciado                                |
| `space-px`   | 1px   | —        | Bordes de 1px, separadores ópticos           |
| `space-0.5`  | 2px   | 0.25U    | Padding interno de badges, gaps micro        |
| `space-1`    | 4px   | 0.5U     | Gap entre icono y label                      |
| `space-2`    | 8px   | 1U       | Padding interno de inputs pequeños           |
| `space-3`    | 12px  | 1.5U     | Padding de buttons compactos                 |
| `space-4`    | 16px  | 2U       | Padding estándar de cards y secciones        |
| `space-5`    | 20px  | 2.5U     | Padding de inputs estándar                   |
| `space-6`    | 24px  | 3U       | Margen entre elementos de formulario         |
| `space-8`    | 32px  | 4U       | Separación entre secciones dentro de una vista|
| `space-10`   | 40px  | 5U       | Padding de modales                           |
| `space-12`   | 48px  | 6U       | Altura de barra de player                    |
| `space-16`   | 64px  | 8U       | Altura de header / navbar                    |
| `space-20`   | 80px  | 10U      | Separación entre bloques de página           |
| `space-24`   | 96px  | 12U      | Padding de páginas en breakpoint lg          |

#### Espaciado de Layout Fijo

Estos valores de layout no pertenecen a la escala general; son constantes estructurales.

| Constante            | Valor | Descripción                           |
|----------------------|-------|---------------------------------------|
| `layout-sidebar-w`   | 240px | Ancho del sidebar de navegación       |
| `layout-player-h`    | 80px  | Altura de la barra de player          |
| `layout-header-h`    | 56px  | Altura del header en vistas internas  |
| `layout-content-max` | 1440px| Max-width del área de contenido       |
| `layout-prose-max`   | 65ch  | Max-width de texto en prosa           |

---

### 1.3 Radios de Borde

El sistema usa radios conservadores que refuerzan el ADN técnico/industrial de la marca. Bordes demasiado redondeados generan una percepción "consumer" que no corresponde al posicionamiento de Music 4 All.

| Token          | Valor  | Uso                                              |
|----------------|--------|--------------------------------------------------|
| `radius-none`  | 0px    | Separadores, barras de progreso                  |
| `radius-sm`    | 2px    | Badges, labels técnicos                          |
| `radius-md`    | 4px    | Cards, inputs, botones primarios, artwork        |
| `radius-lg`    | 8px    | Modales, panels flotantes, tooltips              |
| `radius-xl`    | 12px   | Drawers laterales (uso esporádico)               |
| `radius-full`  | 9999px | Solo para indicadores circulares (● status dot)  |

**Regla:** El `radius-md` (4px) es el radio por defecto para todos los componentes interactivos. Cualquier desviación debe justificarse.

---

### 1.4 Sombras y Glow

El sistema define sombras de elevación y sombras semánticas como categorías separadas. Las primeras comunican altura física; las segundas comunican estado.

#### Sombras de Elevación

| Token          | Nivel | Uso                                           |
|----------------|-------|-----------------------------------------------|
| `shadow-none`  | 0     | Superficie base, sin elevación                |
| `shadow-sm`    | 1     | Cards, tooltips, badges flotantes             |
| `shadow-md`    | 2     | Paneles flotantes, dropdowns, popovers        |
| `shadow-lg`    | 3     | Modales, drawers, overlays                    |
| `shadow-xl`    | 4     | Elemento sobre overlay oscuro                 |

**Valores exactos:**

```
shadow-sm:
  0 1px 3px 0 rgba(0,0,0,0.40)
  0 1px 2px 0 rgba(0,0,0,0.30)

shadow-md:
  0 4px 12px 0 rgba(0,0,0,0.50)
  0 2px  4px 0 rgba(0,0,0,0.40)

shadow-lg:
  0 10px 30px 0 rgba(0,0,0,0.60)
  0  4px  8px 0 rgba(0,0,0,0.40)

shadow-xl:
  0 20px 50px 0 rgba(0,0,0,0.70)
  0  8px 16px 0 rgba(0,0,0,0.50)
```

#### Sombras Semánticas (Glow)

| Token            | Color base  | Uso                                     |
|------------------|-------------|-----------------------------------------|
| `glow-active`    | teal-500    | Pista activa, elemento reproduciendo    |
| `glow-focus`     | teal-500    | Focus ring de componentes               |
| `glow-error`     | semantic-error | Input en error, mensaje crítico      |
| `glow-success`   | semantic-success | Descarga completada               |
| `glow-download`  | semantic-info | Descarga en progreso                 |

**Valores exactos:**

```
glow-active:
  0 0  8px 0 rgba(0,201,167, 0.40)
  0 0 24px 0 rgba(0,201,167, 0.15)

glow-focus:
  0 0 0 2px rgba(0,201,167, 0.50)

glow-error:
  0 0 8px 0 rgba(232,64,64, 0.35)

glow-success:
  0 0 8px 0 rgba(57,211,83, 0.30)

glow-download:
  0 0 8px 0 rgba(59,130,246, 0.35)
```

**Límites de uso de glow:**
- Máximo 2 elementos con glow activo en la misma vista
- Nunca glow en texto de tamaño `display-*`
- En mobile, reducir opacidad al 60%

---

### 1.5 Z-Index

El sistema de capas sigue una escala con saltos deliberados para permitir inserciones futuras sin reordenación.

| Token             | Valor | Capa                                            |
|-------------------|-------|-------------------------------------------------|
| `z-base`          | 0     | Flujo normal del documento                      |
| `z-raised`        | 10    | Cards elevadas, elementos sticky menores        |
| `z-dropdown`      | 100   | Dropdowns, selects, popovers                    |
| `z-sticky`        | 200   | Player bar, header fijo, sidebar                |
| `z-overlay`       | 300   | Backdrop de modal, drawer overlay               |
| `z-modal`         | 400   | Modales, drawers                                |
| `z-toast`         | 500   | Notificaciones Toast                            |
| `z-tooltip`       | 600   | Tooltips (deben estar encima de todo)           |

**Regla:** Nunca usar valores de z-index fuera de esta escala. Si un nuevo componente requiere un nivel intermedio, documentarlo aquí primero.

---

## 2. Tipografía

---

### 2.1 Familias Tipográficas

| Rol                | Familia            | Fallback                          | Variable CSS         |
|--------------------|--------------------|------------------------------------|----------------------|
| Display / Técnica  | Geist Mono         | JetBrains Mono, monospace          | `--font-display`     |
| UI / Interfaz      | Inter              | system-ui, -apple-system, sans-serif| `--font-sans`       |
| Código / CLI       | JetBrains Mono     | Geist Mono, monospace              | `--font-code`        |

**Geist Mono** se usa exclusivamente para:
- Logotipo y nombre de la aplicación
- Títulos de pantalla (H1 de página)
- Valores técnicos numéricos (bitrate, kHz, BPM, tamaño de archivo)
- Badges de formato (FLAC, HiRes, MP3)

**Inter** se usa para:
- Toda navegación y etiquetas de UI
- Cuerpo de texto y descripciones
- Botones y acciones
- Metadatos de álbumes y pistas

**JetBrains Mono** se usa exclusivamente para:
- Rutas de archivo en el sistema
- Vista de metadatos en formato raw/JSON
- Elementos de CLI dentro de la UI

---

### 2.2 Escala de Tamaños

Base: `16px = 1rem`. Todos los valores son exactos; no usar valores intermedios.

| Token          | rem     | px   | Familia     | Uso canónico                               |
|----------------|---------|------|-------------|--------------------------------------------|
| `text-2xl`     | 3.0rem  | 48px | Geist Mono  | Pantalla de bienvenida, logotipo grande    |
| `text-xl`      | 2.25rem | 36px | Geist Mono  | Nombre de álbum en vista hero             |
| `text-lg`      | 1.875rem| 30px | Geist Mono  | H1 de página principal                    |
| `text-heading` | 1.25rem | 20px | Inter       | Títulos de cards y paneles                |
| `text-base`    | 1.0rem  | 16px | Inter       | Cuerpo principal, nombre de pista         |
| `text-sm`      | 0.875rem| 14px | Inter       | Metadatos secundarios, descripciones      |
| `text-xs`      | 0.75rem | 12px | Inter       | Captions, timestamps, anotaciones         |
| `text-2xs`     | 0.625rem| 10px | Geist Mono  | Badges técnicos (FLAC, 24bit)             |

**Escala de display (Geist Mono):**
Los tokens `text-2xl`, `text-xl`, `text-lg` solo aplican a elementos de display. En mobile, reducir un nivel (`text-xl` → `text-lg`, etc.) usando breakpoints.

---

### 2.3 Pesos Tipográficos

| Token           | Valor | Uso                                                    |
|-----------------|-------|--------------------------------------------------------|
| `font-normal`   | 400   | Cuerpo de texto, metadatos, descripciones              |
| `font-medium`   | 500   | Labels de UI, etiquetas de campo, texto de badge       |
| `font-semibold` | 600   | Títulos de card, nombres de sección, énfasis           |
| `font-bold`     | 700   | Display, logotipo, H1 de página                        |

Restricciones:
- Geist Mono solo usa pesos 500, 600 y 700
- Inter usa todos los pesos
- JetBrains Mono solo usa peso 400

---

### 2.4 Jerarquías Semánticas

La jerarquía tipográfica define cómo se combina familia + tamaño + peso para cada rol de contenido. Estos son los únicos emparejamientos válidos.

| Rol                  | Familia     | Tamaño         | Peso    | Color           |
|----------------------|-------------|----------------|---------|-----------------|
| App name / Logo      | Geist Mono  | `text-xl`+     | 700     | `teal-500`      |
| Page title (H1)      | Geist Mono  | `text-lg`      | 600     | `text-primary`  |
| Panel header (H2)    | Inter       | `text-heading` | 600     | `text-primary`  |
| Card title           | Inter       | `text-base`    | 600     | `text-primary`  |
| Track name           | Inter       | `text-base`    | 500     | `text-primary`  |
| Artist / Album label | Inter       | `text-sm`      | 400     | `text-secondary`|
| Technical metadata   | Geist Mono  | `text-sm`      | 500     | `text-secondary`|
| Timestamp / duration | Geist Mono  | `text-xs`      | 400     | `text-secondary`|
| Body text            | Inter       | `text-sm`      | 400     | `text-secondary`|
| Caption              | Inter       | `text-xs`      | 400     | `text-disabled` |
| File path            | JetBrains   | `text-xs`      | 400     | `text-secondary`|
| Format badge text    | Geist Mono  | `text-2xs`     | 500     | `teal-300`      |
| Button label         | Inter       | `text-sm`      | 500     | Según variante  |
| Input label          | Inter       | `text-xs`      | 500     | `text-secondary`|
| Nav item             | Inter       | `text-sm`      | 500     | Según estado    |

---

### 2.5 Line-Height y Tracking

| Contexto                   | Line-height | Letter-spacing |
|----------------------------|-------------|----------------|
| Display (Geist Mono)       | 1.1         | `0.04em`       |
| Títulos (Geist Mono)       | 1.2         | `0.02em`       |
| Valores técnicos mono       | 1.0         | `0.01em`       |
| Cuerpo de texto (Inter)    | 1.6         | `0`            |
| Metadatos compactos (Inter)| 1.4         | `0`            |
| Labels y botones (Inter)   | 1.0         | `0.01em`       |
| Badges técnicos (Geist)    | 1.0         | `0.05em`       |

---

## 3. Componentes Base

Cada componente se define por:
- **Anatomía:** partes que lo componen
- **Variantes:** versiones permitidas
- **Tamaños:** escalas disponibles
- **Estados:** comportamiento visual por estado
- **Especificaciones:** medidas, espaciados, tokens aplicados
- **Reglas:** restricciones de uso

---

### 3.1 Button

El botón es el componente de mayor visibilidad en la UI. Toda acción principal, secundaria o destructiva pasa por él.

#### Anatomía

```
┌──────────────────────────────┐
│  [icon?]  [label]  [icon?]   │
└──────────────────────────────┘
   ↑                    ↑
   Leading icon         Trailing icon
   (opcional)           (opcional)
```

#### Variantes

| Variante      | Fondo            | Borde             | Texto           | Uso                          |
|---------------|------------------|-------------------|-----------------|------------------------------|
| `primary`     | `teal-500`       | Ninguno           | `#080B0F`       | Acción principal de la vista |
| `secondary`   | Transparente     | `border-default`  | `text-primary`  | Acción secundaria            |
| `ghost`       | Transparente     | Ninguno           | `text-secondary`| Acción terciaria / nav       |
| `danger`      | Transparente     | `semantic-error`  | `semantic-error`| Acciones destructivas        |
| `icon-only`   | Transparente     | Ninguno           | —               | Acciones de icono compacto   |

**Restricción:** Solo puede existir un botón `primary` visible por sección de pantalla. Si hay dos CTAs importantes, el segundo debe ser `secondary`.

#### Tamaños

| Tamaño | Altura | Padding H | Padding V | Font size     | Icon size |
|--------|--------|-----------|-----------|---------------|-----------|
| `sm`   | 28px   | 10px      | 4px       | `text-xs`     | 14px      |
| `md`   | 36px   | 16px      | 8px       | `text-sm`     | 16px      |
| `lg`   | 44px   | 20px      | 10px      | `text-base`   | 20px      |

El tamaño `md` es el estándar. `sm` se usa en contextos de alta densidad (filas de tabla, barras de herramientas). `lg` solo para CTAs de onboarding o pantallas de error.

#### Especificaciones de Estilo

- **Border-radius:** `radius-md` (4px) en todos los tamaños
- **Transición:** `150ms ease-out` para color, `100ms ease-out` para transform
- **Transform en pressed:** `scale(0.97)` + `translateY(1px)` — simula presión física
- **Font:** Inter `font-medium` (500)
- **Ícono + texto:** gap de `space-1` (4px)
- **Touch target mínimo:** 44×44px en todos los casos (usar padding invisible si el botón es más pequeño)

#### Estados

Los estados se describen en la [Sección 4](#4-estados).

#### Reglas

- El `primary` nunca tiene borde visible
- El `danger` nunca tiene relleno sólido (solo borde + texto en `semantic-error`)
- El `icon-only` nunca se usa sin un `title` attribute descriptivo
- Nunca deshabilitar un botón sin explicar por qué (usar tooltip)

---

### 3.2 Input

Los inputs son la interfaz entre el usuario y los datos de búsqueda, configuración y filtrado. Deben comunicar precisión y control.

#### Anatomía

```
[label]               ← Inter xs, font-medium, text-secondary
┌───────────────────────────────────┐
│  [leading-icon]  [value/placeholder]  [trailing-icon]  │
└───────────────────────────────────┘
[helper text / error message]     ← Inter xs, text-secondary / semantic-error
```

#### Variantes

| Variante     | Fondo          | Borde             | Uso                           |
|--------------|----------------|-------------------|-------------------------------|
| `default`    | `surface-console` | `border-default` | Inputs estándar de formulario |
| `filled`     | `surface-studio`  | Ninguno           | Búsqueda inline en la UI      |
| `ghost`      | Transparente    | `border-subtle`   | Filtros en barras de herramientas |

#### Tamaños

| Tamaño | Altura | Padding H | Padding V | Font size  |
|--------|--------|-----------|-----------|------------|
| `sm`   | 28px   | 10px      | 4px       | `text-xs`  |
| `md`   | 36px   | 14px      | 8px       | `text-sm`  |
| `lg`   | 44px   | 16px      | 10px      | `text-base`|

#### Especificaciones de Estilo

- **Border-radius:** `radius-md` (4px)
- **Border width:** 1px, sin relleno de sombra en reposo
- **Placeholder:** color `text-ghost`, nunca más oscuro
- **Transición de focus:** `100ms ease-out`
- **Label:** siempre visible, nunca como placeholder que desaparece
- **Helper text:** espacio de `space-1` (4px) bajo el input

#### Subcomponentes

**Search Input:** Variante especializada con icono de lupa fijo a la izquierda, sin label visible, con shortcut keyboard hint a la derecha (`⌘K`).

**Password Input:** Trailing icon de ojo (toggle visibilidad). El icono usa `text-secondary` en reposo, `text-primary` al activar.

**Numeric Technical Input:** Usa JetBrains Mono como fuente del valor. Muestra unidad a la derecha (kbps, Hz, MB) en `text-disabled`.

---

### 3.3 Card

Las cards son los contenedores de colecciones: álbumes, playlists, pistas. Son el componente de mayor densidad visual.

#### Anatomía — Card de Álbum (Album Card)

```
┌───────────────────────┐
│                       │ ← Artwork container
│      [ARTWORK]        │   aspect-ratio: 1/1
│                       │   border-radius: radius-md en esquinas sup.
│                       │
├───────────────────────┤
│ Album Title           │ ← Inter font-semibold, text-base, text-primary
│ Artist Name           │ ← Inter font-normal, text-sm, text-secondary
│ FLAC · 24bit · 1997  │ ← Geist Mono, text-2xs, text-secondary
└───────────────────────┘
```

#### Anatomía — Card de Pista (Track Row)

```
┌───────────────────────────────────────────────────────────────────────┐
│ [#] [artwork-xs] [Title            ] [Artist  ] [Duration] [Quality] [⋯]│
└───────────────────────────────────────────────────────────────────────┘
```

Donde:
- `#`: Número de pista, Geist Mono `text-xs`, `text-disabled`. En hover, muta a ▶ icono.
- `artwork-xs`: 40×40px, `radius-sm`
- `Title`: Inter `font-medium`, `text-base`, `text-primary`
- `Artist`: Inter `font-normal`, `text-sm`, `text-secondary`
- `Duration`: Geist Mono `text-xs`, `text-secondary`
- `Quality`: Badge de formato (ver [Badge](#36-badge))
- `⋯`: Botón `icon-only` ghost, aparece solo en hover

#### Variantes de Card

| Variante      | Layout   | Uso                                          |
|---------------|----------|----------------------------------------------|
| `album-grid`  | Vertical | Vista de librería en modo cuadrícula         |
| `album-list`  | Fila     | Vista de librería en modo lista              |
| `track-row`   | Fila     | Filas dentro de un álbum o playlist          |
| `playlist`    | Vertical | Similar a album-grid con icono diferenciador |
| `download`    | Fila     | Elemento en la cola de descargas             |

#### Especificaciones de Estilo

- **Fondo:** `surface-console`
- **Borde:** 1px `border-default`
- **Border-radius:** `radius-md` (4px)
- **Sombra en reposo:** `shadow-sm`
- **Sombra en hover:** `shadow-md`
- **Transición:** `150ms ease-out` para background, shadow y border
- **Ancho en grid:** Mínimo 160px, máximo 220px. Grid: `repeat(auto-fill, minmax(160px, 1fr))`
- **Gap en grid:** `space-4` (16px)
- **Padding interno (info):** `space-3` (12px) horizontal, `space-2` (8px) vertical

#### Artwork dentro de Card

- Sin filtro de color, sin overlay por defecto
- `object-fit: cover`
- `border-radius` solo en las esquinas superiores cuando hay info debajo
- En hover: overlay muy sutil `rgba(0,0,0,0.15)` con icono de acción centrado (▶ o ↓)

---

### 3.4 Modal

Los modales son para acciones que requieren contexto aislado: confirmación de eliminación, detalle de metadatos, configuración compleja.

#### Anatomía

```
┌─────────────────────────────────────────────────────┐
│  [título]                                    [✕]    │ ← Header
├─────────────────────────────────────────────────────┤
│                                                     │
│  [contenido del modal]                              │ ← Body
│                                                     │
├─────────────────────────────────────────────────────┤
│                    [Cancelar]  [Acción Principal]   │ ← Footer
└─────────────────────────────────────────────────────┘
```

#### Tamaños

| Tamaño  | Ancho   | Uso                                              |
|---------|---------|--------------------------------------------------|
| `sm`    | 400px   | Confirmaciones simples, mensajes                 |
| `md`    | 560px   | Formularios de configuración                     |
| `lg`    | 720px   | Vista de metadatos completa, detalles de pista   |
| `full`  | 90vw    | Visualizaciones complejas, never para formularios|

#### Especificaciones de Estilo

- **Fondo del modal:** `surface-studio`
- **Borde:** 1px `border-default`
- **Border-radius:** `radius-lg` (8px)
- **Sombra:** `shadow-xl`
- **Backdrop:** `rgba(8,11,15,0.80)` — usa el color `void` con 80% opacidad, no negro puro
- **Padding del body:** `space-6` (24px)
- **Padding del header y footer:** `space-4` vertical, `space-6` horizontal
- **Separadores:** 1px `border-subtle`
- **Botón de cierre (✕):** Posición `top: space-4, right: space-4`, `icon-only ghost`

#### Comportamiento

- Aparece con animación `fade-in` + `scale(0.96→1.00)` en `200ms ease-out`
- Desaparece con `fade-out` + `scale(1.00→0.96)` en `150ms ease-in`
- Se cierra con: botón ✕, tecla `Escape`, clic en backdrop
- Foco se mueve automáticamente al primer elemento interactivo del modal al abrirse
- Al cerrarse, el foco regresa al elemento que lo abrió

---

### 3.5 Toast

Los toasts comunican el resultado de operaciones asíncronas: inicio de descarga, error de red, conexión perdida con Tidal. Son informativos, no requieren acción del usuario.

#### Anatomía

```
┌──────────────────────────────────────────────────────┐
│  [icon]  [título]  [descripción breve]        [✕]?   │
└──────────────────────────────────────────────────────┘
```

#### Variantes

| Variante    | Icono              | Borde izquierdo    | Uso                          |
|-------------|--------------------|--------------------|------------------------------|
| `success`   | Check circle       | `semantic-success` | Descarga completada          |
| `error`     | X circle           | `semantic-error`   | Error de red, error de API   |
| `warning`   | Triangle alert     | `semantic-warning` | Descarga pausada, rate limit |
| `info`      | Info circle        | `semantic-info`    | Descarga iniciada, en cola   |

#### Especificaciones de Estilo

- **Fondo:** `surface-studio`
- **Borde:** 1px `border-default`
- **Borde izquierdo:** 3px del color de la variante
- **Border-radius:** `radius-md` (4px)
- **Sombra:** `shadow-lg`
- **Ancho:** fijo 360px en desktop, 100% en mobile
- **Padding:** `space-4` (16px) horizontal, `space-3` (12px) vertical
- **Posición:** `bottom-right` por defecto, stack vertical con `space-2` (8px) entre toasts
- **Z-index:** `z-toast` (500)
- **Duración:** `success` e `info` auto-dismiss en 4000ms. `error` y `warning` persisten hasta cierre manual.

#### Comportamiento de Animación

- Entrada: slide desde el borde derecho + fade-in, `300ms ease-out`
- Salida: slide hacia el borde derecho + fade-out, `200ms ease-in`
- El stack se reordena con `300ms ease-out` cuando se elimina un toast

---

### 3.6 Badge

Los badges son etiquetas de estado compactas. En Music 4 All tienen un rol principalmente técnico: comunicar formato de audio, calidad, estado de descarga.

#### Anatomía

```
┌─────────────────┐
│  [dot?]  [text]  │
└─────────────────┘
```

#### Variantes

| Variante      | Fondo               | Texto          | Borde              | Uso                      |
|---------------|---------------------|----------------|--------------------|--------------------------|
| `format`      | Transparente        | `teal-300`     | `teal-500` 1px     | FLAC, MP3, AAC, HiRes    |
| `quality`     | `teal-500` 15%      | `teal-400`     | `teal-500` 1px     | 24bit, HiRes, MQA        |
| `status-ok`   | `semantic-success` 15%| `semantic-success`| —              | Completado               |
| `status-error`| `semantic-error` 15%  | `semantic-error`  | —              | Error                    |
| `status-warn` | `semantic-warning` 15%| `semantic-warning`| —              | Advertencia              |
| `status-info` | `semantic-info` 15%   | `semantic-info`   | —              | En progreso              |
| `status-queue`| `semantic-queue` 15%  | `semantic-queue`  | —              | En cola                  |

#### Especificaciones de Estilo

- **Fuente:** Geist Mono, `text-2xs` (10px), `font-medium`
- **Padding:** `space-0.5` vertical (2px), `space-1` horizontal (4px)
- **Border-radius:** `radius-sm` (2px)
- **Texto:** SIEMPRE en mayúsculas
- **Dot (punto de estado):** `radius-full`, 6×6px, color de la variante
- **Sombra:** ninguna

#### Reglas

- El texto de badge nunca supera 8 caracteres
- No usar más de 2 badges en la misma fila de una track card
- Los badges `format` y `quality` son mutuamente excluyentes: elegir el más relevante según contexto

---

### 3.7 ProgressBar

La barra de progreso es el componente de mayor uso en la funcionalidad core de la app: comunicar el estado de descargas con precisión técnica.

#### Anatomía

```
┌──────────────────────────────────────────────────────────┐  ← Track (fondo)
│ ██████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← Fill
└──────────────────────────────────────────────────────────┘
  ↑ 56%                                             44% ↑
```

**Con metadatos:**

```
  Track Name.flac                                  2.4 MB/s  ← Texto superior
  ┌──────────────────────────────────────────────────────┐
  │ █████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
  └──────────────────────────────────────────────────────┘
  56% completado                              1:24 restante  ← Texto inferior
```

#### Variantes

| Variante       | Color de fill         | Uso                              |
|----------------|-----------------------|----------------------------------|
| `download`     | `semantic-info`       | Descarga en progreso             |
| `success`      | `semantic-success`    | Descarga completada              |
| `error`        | `semantic-error`      | Descarga fallida                 |
| `indeterminate`| `teal-500`            | Operación sin duración conocida  |

#### Tamaños

| Tamaño | Altura del track | Uso                                    |
|--------|------------------|----------------------------------------|
| `sm`   | 2px              | Indicadores en player, VU meter fino   |
| `md`   | 4px              | Barras de descarga estándar            |
| `lg`   | 8px              | Barra de progreso de reproducción      |

#### Especificaciones de Estilo

- **Track fondo:** `surface-rack` (#21303F)
- **Border-radius:** `radius-none` (0px) — las barras son rectangulares
- **Fill:** color de variante, sin gradiente
- **Transición del fill:** `width` con `300ms ease-out` (no linear, da sensación de respuesta)
- **Glow en download activo:** `glow-download` en el fill
- **Animación indeterminate:** el fill se mueve de izquierda a derecha en loop, `1500ms ease-in-out`

---

### 3.8 Tooltip

Los tooltips proveen contexto adicional sin interrumpir el flujo. En Music 4 All se usan especialmente para botones icon-only y metadatos técnicos.

#### Anatomía

```
           ┌────────────────────┐
           │   Texto del tooltip │
           └──────────┬─────────┘
                      │
              [elemento trigger]
```

#### Especificaciones de Estilo

- **Fondo:** `surface-rack` (#21303F)
- **Texto:** Inter `text-xs`, `font-normal`, `text-primary`
- **Padding:** `space-2` vertical (8px), `space-3` horizontal (12px)
- **Border-radius:** `radius-lg` (8px)
- **Borde:** 1px `border-default`
- **Sombra:** `shadow-md`
- **Z-index:** `z-tooltip` (600)
- **Max-width:** 240px
- **Delay de aparición:** 400ms (evita tooltips involuntarios)
- **Animación:** fade-in `150ms ease-out`

#### Posicionamiento

Orden de preferencia: `top` → `bottom` → `left` → `right`. El tooltip se reposiciona automáticamente si no cabe en su posición preferida.

#### Contenido Especial para Metadatos Técnicos

En filas de pistas, el tooltip sobre el badge de calidad muestra:

```
┌─────────────────────────┐
│  FLAC                   │
│  Bit depth: 24-bit      │
│  Sample rate: 96 kHz    │
│  Bitrate: ~4600 kbps    │
└─────────────────────────┘
```

Con Geist Mono para los valores numéricos e Inter para las etiquetas.

---

### 3.9 Tabs

Las tabs son el mecanismo de navegación secundaria dentro de una vista (por ejemplo: "Tracks", "About", "Credits" en la vista de álbum).

#### Anatomía

```
  Tracks      About    Credits
  ──────
  ↑ Tab activo: subrayado teal-500, 2px
```

#### Variantes

| Variante       | Descripción                                             |
|----------------|---------------------------------------------------------|
| `underline`    | Tabs con indicador de subrayado. Uso principal.         |
| `panel`        | Tabs con fondo en el item activo. Para secciones mayores.|

#### Especificaciones de Estilo — Variante `underline`

- **Tab activo:** `text-primary`, `font-medium`, indicador 2px `teal-500` en borde inferior
- **Tab inactivo:** `text-secondary`, `font-normal`, sin indicador
- **Tab hover:** `text-primary`, sin indicador visible
- **Indicador:** transición `150ms ease-out` de posición y opacidad
- **Separador bajo tabs:** 1px `border-subtle`
- **Padding de tab:** `space-4` horizontal (16px), `space-3` vertical (12px)
- **Font:** Inter `text-sm`

#### Especificaciones de Estilo — Variante `panel`

- **Tab activo:** fondo `surface-rack`, `text-primary`, `font-medium`
- **Tab inactivo:** fondo `surface-console`, `text-secondary`
- **Border-radius:** `radius-md` (4px)
- **Transición de fondo:** `150ms ease-out`

#### Reglas

- Máximo 6 tabs visibles. Si hay más, usar scroll horizontal dentro del contenedor de tabs.
- Las tabs nunca se apilan verticalmente (eso es navegación, no tabs).
- El panel de contenido activo no tiene ninguna animación de transición adicional a la que Framer Motion provea el componente padre.

---

## 4. Estados

Cada componente interactivo debe implementar todos los estados relevantes de esta sección. No es aceptable omitir estados por brevedad de implementación.

---

### 4.1 Loading

**Comportamiento visual:** Skeleton screens, nunca spinners coloridos. El skeleton debe respetar la estructura del contenido que va a aparecer.

**Especificaciones:**

- **Color base del skeleton:** `surface-studio` (#1A2330)
- **Color del shimmer:** `surface-rack` (#21303F)
- **Animación:** shimmer horizontal, `1500ms linear infinite`
- **Border-radius:** igual al del elemento que reemplaza
- **No usar:** spinners de colores, spinners circulares en componentes grandes

**En botones:** el botón muestra un skeleton de su propio label mientras la acción está en curso. Alternativamente, el icono de botón se reemplaza por una barra de progreso `sm` dentro del mismo botón.

**En páginas:** skeleton de toda la anatomía de la página, no solo del contenido principal.

---

### 4.2 Hover

**Principio:** El hover debe ser visible pero no estridente. Comunica interactividad sin distraer.

| Componente  | Cambio en hover                                         | Transición       |
|-------------|----------------------------------------------------------|------------------|
| Button primary | Fondo `teal-400`, sombra `glow-active` muy sutil   | `150ms ease-out` |
| Button secondary | Fondo `surface-rack`, borde `teal-500`           | `150ms ease-out` |
| Button ghost | Fondo `surface-console`                               | `150ms ease-out` |
| Card album  | Fondo `surface-rack`, sombra `shadow-md`               | `150ms ease-out` |
| Track row   | Fondo `surface-rack`, aparece botón de acción `⋯`      | `150ms ease-out` |
| Nav item    | Fondo `surface-console`, texto `text-primary`          | `100ms ease-out` |
| Tab         | Texto `text-primary`                                   | `100ms ease-out` |
| Input       | Borde `text-disabled` (un tono más claro)              | `100ms ease-out` |

**Regla:** El cursor cambia a `pointer` en todos los elementos con hover. Nunca usar `cursor-default` en un elemento interactivo.

---

### 4.3 Focus

El focus es crítico para la accesibilidad. Debe ser visible en todo momento para usuarios de teclado.

**Especificación global del focus ring:**

```
outline: 2px solid #00C9A750  (border-focus)
outline-offset: 2px
border-radius: igual al del elemento
```

- El focus ring siempre es visible, nunca `outline: none` sin reemplazo
- En inputs, el focus cambia además el borde a `teal-500` 1px
- En cards, el focus ring reemplaza al borde exterior del card
- El color del focus ring es siempre `teal-500` en su versión semitransparente, sin excepciones

---

### 4.4 Disabled

Un elemento deshabilitado indica que la acción no está disponible en este momento. Debe comunicar el estado sin crear confusión.

**Especificaciones globales:**

- **Opacidad:** `opacity: 0.38` en todos los elementos deshabilitados
- **Cursor:** `cursor-not-allowed`
- **Pointer events:** `pointer-events: none`
- **Color:** Los colores de texto pasan a `text-disabled`. Los fondos mantienen su valor.
- **Sin hover:** El estado disabled suprime cualquier efecto de hover
- **Sin focus:** Los elementos disabled no son alcanzables con teclado (excepto cuando hay explicación de por qué está disabled, en cuyo caso sí es navegable para que el tooltip sea accesible)

---

### 4.5 Success

El estado de éxito se aplica principalmente en: confirmación de descarga completada, guardado exitoso de configuración, conexión exitosa con Tidal.

**En componentes:**

| Componente   | Cambio en success                                        |
|--------------|----------------------------------------------------------|
| ProgressBar  | Fill cambia a `semantic-success`, glow `glow-success`    |
| Badge        | Variante `status-ok`                                     |
| Input        | Borde izquierdo 3px `semantic-success`, icono check      |
| Button       | Tras acción exitosa: icono check + label "Done" por 1500ms, luego vuelve al estado normal |
| Toast        | Variante `success` aparece con el resultado              |

---

### 4.6 Error

El estado de error comunica fallo sin alarmar. Debe ser visible pero no generar ansiedad. Da información accionable siempre que sea posible.

**En componentes:**

| Componente   | Cambio en error                                                |
|--------------|----------------------------------------------------------------|
| ProgressBar  | Fill cambia a `semantic-error`, glow `glow-error`              |
| Badge        | Variante `status-error`                                        |
| Input        | Borde 1px `semantic-error`, `border-error` en focus ring, helper text con descripción del error |
| Button danger| Estado normal del botón ya comunica peligro                    |
| Toast        | Variante `error` persiste hasta cierre manual                  |
| Track row    | Ícono de error en lugar del número de pista                    |

**Mensajes de error:** Siempre en primera persona del sistema, nunca culpando al usuario. Incluir acción de recuperación cuando sea posible.

```
✗  Download failed — Tidal returned 403. Check your session.  [Retry]
```

No:
```
✗  Error 403: Forbidden
```

---

## 5. Accesibilidad

La accesibilidad no es opcional. El público objetivo incluye power users que pueden usar lectores de pantalla o navegación por teclado por preferencia técnica, además de usuarios con necesidades de accesibilidad.

**Objetivo de conformidad:** WCAG 2.1 nivel AA como mínimo.

---

### 5.1 Contraste

Todos los pares de texto/fondo deben cumplir el ratio mínimo establecido por WCAG 2.1.

| Par                                  | Ratio | Nivel WCAG |
|--------------------------------------|-------|------------|
| `text-primary` / `surface-void`      | 16.2:1| AAA        |
| `text-primary` / `surface-abyss`     | 14.8:1| AAA        |
| `text-primary` / `surface-console`   | 12.1:1| AAA        |
| `text-secondary` / `surface-void`    | 6.8:1 | AA         |
| `text-secondary` / `surface-console` | 5.2:1 | AA         |
| `teal-500` / `surface-void`          | 7.1:1 | AA         |
| `teal-500` / `#080B0F` (button text) | 7.1:1 | AA         |
| `semantic-success` / `surface-console` | 5.8:1| AA        |
| `semantic-error` / `surface-console`  | 5.4:1| AA        |
| `semantic-warning` / `surface-console`| 4.6:1| AA        |

**Caso especial — Badges:**
Los badges de formato usan texto `teal-300` sobre fondo semitransparente. Verificar siempre el contraste efectivo sobre el fondo subyacente, no sobre el fondo del badge.

**Texto decorativo:**
`text-disabled` y `text-ghost` no cumplen AA y **solo pueden usarse en texto que no sea funcional**: placeholders inactivos, sombras de texto, elementos de adorno.

---

### 5.2 Navegación por Teclado

Toda la UI debe ser completamente operable con teclado. La secuencia de foco debe ser lógica y predecible.

#### Orden de Tab (Tab Order)

Reglas globales:
- El orden de tab sigue el orden visual de izquierda a derecha, arriba a abajo
- La sidebar de navegación debe tener un tab order separado del contenido principal usando `tabindex` y regiones ARIA
- El player bar persistente es siempre accesible desde teclado en cualquier pantalla

#### Atajos de Teclado de la Aplicación

| Acción                     | Atajo            | Componente afectado        |
|----------------------------|------------------|----------------------------|
| Abrir búsqueda             | `⌘K` / `Ctrl+K`  | Search input               |
| Play / Pause               | `Space`          | Player (cuando foco no está en input) |
| Pista anterior             | `←` / `J`        | Player                     |
| Pista siguiente            | `→` / `K`        | Player                     |
| Subir volumen              | `↑`              | Player (cuando foco está en player) |
| Bajar volumen              | `↓`              | Player (cuando foco está en player) |
| Cerrar modal               | `Escape`         | Modal                      |
| Navegar tabs               | `←` `→`          | Tab component              |
| Seleccionar item de lista  | `Enter` / `Space`| Track rows, cards          |
| Menú contextual de item    | `⌘M` / `Ctrl+M`  | Track rows                 |

Los atajos de teclado deben mostrarse en tooltips del elemento correspondiente.

#### Focus Trapping

- Los modales **atrapan el foco**: Tab no puede salir del modal mientras está abierto
- Los drawers atrapan el foco mientras están abiertos
- Al cerrar un modal/drawer, el foco regresa al elemento que lo activó
- Los tooltips y popovers **no** atrapan el foco

#### Skip Links

Incluir un skip link como primer elemento del DOM en cada página:

```
[Skip to main content]  ← visible solo al recibir foco, posición absolute top-0
```

---

### 5.3 Lectores de Pantalla

Cada componente debe comunicar su propósito y estado de forma completa a tecnologías de asistencia.

#### Roles ARIA por Componente

| Componente     | Role ARIA          | Notas de implementación                          |
|----------------|--------------------|--------------------------------------------------|
| Sidebar nav    | `navigation`       | `aria-label="Main navigation"`                   |
| Player bar     | `region`           | `aria-label="Now playing"`                       |
| Track list     | `list`             | Cada fila es `listitem`                          |
| Modal          | `dialog`           | `aria-modal="true"`, `aria-labelledby`           |
| Toast          | `alert` o `status` | `alert` para error/warning, `status` para info/success |
| ProgressBar    | `progressbar`      | `aria-valuenow`, `aria-valuemin`, `aria-valuemax`|
| Tabs           | `tablist`          | Cada tab: `tab`, panel: `tabpanel`               |
| Tooltip        | Ninguno (via attr) | `aria-describedby` en el elemento trigger        |
| Badge de estado| `status`           | Envuelto en elemento con `aria-live="polite"`    |
| Botón icon-only| `button`           | Requiere `aria-label` descriptivo                |

#### Etiquetas Descriptivas

**Botones de acción en track rows:**

```
aria-label="Download Radiohead - Creep (FLAC)"
aria-label="Add Radiohead - Creep to queue"
```

No usar solo "Download" o "Add" sin contexto.

**ProgressBar de descarga:**

```
aria-label="Downloading Radiohead - OK Computer"
aria-valuenow="56"
aria-valuemin="0"
aria-valuemax="100"
```

Incluir texto accesible adicional con el porcentaje y tiempo restante para lectores que no verbalizan `aria-valuenow` con contexto suficiente.

**Player bar:**

El estado de reproducción debe anunciarse al cambiar:
```
aria-live="polite"
aria-label="Now playing: Creep by Radiohead from OK Computer"
```

#### Imágenes y Artwork

- Todo artwork de álbum requiere `alt="Album cover for [Album Name] by [Artist]"`
- Los artwork puramente decorativos (fondo de pantalla, degradés) usan `alt=""`
- Los iconos siempre son `aria-hidden="true"` cuando acompañan texto. Cuando son solos, el elemento padre tiene `aria-label`

#### Live Regions para Eventos Asíncronos

Las descargas y cambios de estado deben anunciarse mediante live regions:

| Evento                  | `aria-live` | Prioridad | Mensaje de ejemplo                          |
|-------------------------|-------------|-----------|---------------------------------------------|
| Descarga iniciada       | `polite`    | Baja      | "Download started: OK Computer by Radiohead"|
| Descarga completada     | `polite`    | Baja      | "Download complete: OK Computer"            |
| Error de descarga       | `assertive` | Alta      | "Download failed: connection error"         |
| Conexión perdida a Tidal| `assertive` | Alta      | "Connection to Tidal lost. Reconnecting..."  |

Los mensajes `assertive` interrumpen al lector de pantalla. Solo para errores críticos.

---

## Apéndice A — Checklist de Implementación por Componente

Al implementar cualquier componente del design system, verificar:

### Checklist Visual
- [ ] Usa tokens de color del sistema (ningún valor hardcodeado)
- [ ] Usa tokens de espaciado del sistema
- [ ] Usa la familia tipográfica correcta para el rol
- [ ] Border-radius dentro de los valores permitidos
- [ ] Sombra del nivel de elevación correcto
- [ ] Transiciones con `ease-out` y duración ≤ 300ms
- [ ] Sin gradientes multicolor

### Checklist de Estados
- [ ] Estado `default` implementado
- [ ] Estado `hover` implementado (con transición)
- [ ] Estado `focus` implementado (con focus ring)
- [ ] Estado `disabled` implementado (opacity 0.38, cursor not-allowed)
- [ ] Estado `loading` implementado si aplica
- [ ] Estado `error` implementado si aplica
- [ ] Estado `success` implementado si aplica

### Checklist de Accesibilidad
- [ ] Contraste de texto ≥ 4.5:1 (WCAG AA)
- [ ] Focus ring visible en navegación por teclado
- [ ] `aria-label` en botones icon-only
- [ ] Role ARIA correcto asignado
- [ ] Texto alternativo en imágenes
- [ ] Tecla `Escape` cierra overlays
- [ ] Tab order lógico y predecible
- [ ] No depende solo del color para comunicar estado (siempre hay icono o texto adicional)

---

## Apéndice B — Tokens como Variables CSS

Referencia rápida de tokens implementados como custom properties CSS. Estos serán las variables en `globals.css` y extendidos en `tailwind.config.ts`.

```
/* Surfaces */
--color-void:     #080B0F
--color-abyss:    #0D1117
--color-console:  #131920
--color-studio:   #1A2330
--color-rack:     #21303F

/* Text */
--color-text-primary:   #E8EFF5
--color-text-secondary: #8FA3B8
--color-text-disabled:  #4D6278
--color-text-ghost:     #2C3E50

/* Teal accent */
--color-teal-300: #4DFFD9
--color-teal-400: #00E5BF
--color-teal-500: #00C9A7
--color-teal-700: #008C73

/* Semantic */
--color-success: #39D353
--color-warning: #E8A020
--color-error:   #E84040
--color-info:    #3B82F6
--color-queue:   #8B5CF6

/* Borders */
--color-border-default: #1E2D3D
--color-border-subtle:  #162030
--color-border-focus:   #00C9A750
--color-border-error:   #E8404050

/* Spacing base */
--space-unit: 8px

/* Radius */
--radius-none: 0px
--radius-sm:   2px
--radius-md:   4px
--radius-lg:   8px
--radius-xl:   12px
--radius-full: 9999px

/* Z-index */
--z-base:     0
--z-raised:   10
--z-dropdown: 100
--z-sticky:   200
--z-overlay:  300
--z-modal:    400
--z-toast:    500
--z-tooltip:  600
```

---

*Music 4 All Design System v1.0 · Junio 2026*  
*Debe mantenerse sincronizado con `docs/brand-identity.md` en cada iteración de diseño.*  
*Próxima revisión: al completar la implementación de los componentes base.*
