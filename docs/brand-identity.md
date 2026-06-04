# Music 4 All — Documento de Identidad Visual

> Versión 1.0 · Junio 2026  
> Stack: Next.js 14 · TypeScript · Tailwind CSS · Framer Motion

---

## 1. Personalidad de la Marca

Music 4 All no es un reproductor más. Es la intersección entre la nostalgia de los grandes sistemas de audio analógicos y la precisión de la tecnología digital moderna. La marca se comporta como un **ingeniero de sonido experimentado**: rigurosa, refinada, sin adornos innecesarios. No grita, no parpadea. Simplemente funciona con una elegancia que se nota.

**Arquetipos de marca:**

| Arquetipo | Rol en Music 4 All |
|---|---|
| El Sabio | Conoce cada detalle técnico, presenta metadatos con precisión quirúrgica |
| El Creador | Celebra la música como arte, trata los álbumes con respeto curatorial |
| El Explorador | Permite descubrir colecciones, navegar sin fricción |

**Voz de la marca:**
- Directa. Sin jerga de marketing.
- Técnicamente precisa cuando es necesario.
- Nunca condescendiente. Nunca infantil.
- Tono: "estudio de grabación profesional", no "app para millennials".

---

## 2. Emociones que Debe Transmitir

La experiencia de uso debe evocar emociones en capas, como escuchar un vinilo en un equipo Hi-Fi de referencia:

**Primaria — La sensación inmediata:**
- **Confianza técnica** → el usuario siente que la app sabe lo que hace
- **Calma concentrada** → interfaz que no compite con la música
- **Control total** → todo está donde se espera, todo responde

**Secundaria — La resonancia emocional:**
- **Nostalgia de calidad** → reminiscencia de Winamp en su mejor época, el VU meter que se mueve
- **Satisfacción audiófila** → como cuando encuentras un archivo FLAC perfecto
- **Orgullo silencioso** → la sensación de tener una herramienta que los demás no tienen

**Evitar activamente:**
- Ansiedad por notificaciones
- Gamificación forzada
- Desorientación visual
- Frivolidad

---

## 3. Público Objetivo

### Primario — El Audiófilo Digital

- **Perfil:** 25–45 años, principalmente masculino, ingeniería o industria creativa
- **Comportamiento:** Tidal HiFi subscriber, tiene DAC externo, conoce la diferencia entre FLAC y MP3 320k
- **Pain point:** Quiere su biblioteca local, organizada, con metadatos correctos, sin suscripción perpetua
- **Expectativa:** Herramienta que respete su inteligencia y su tiempo

### Secundario — El Coleccionista de Música

- **Perfil:** 30–55 años, cultura de vinilo pero pragmático digital
- **Comportamiento:** Referencia metadatos, cuida el artwork, organiza por año/sello
- **Pain point:** Las apps de streaming no preservan metadatos extendidos (ISRC, comentarios, replayGain)
- **Expectativa:** Control editorial sobre su colección

### Terciario — El Power User Técnico

- **Perfil:** Cualquier edad, developer o entusiasta, Linux-friendly mindset
- **Comportamiento:** CLI primero, luego GUI. Aprecia las opciones avanzadas visibles
- **Expectativa:** Densidad de información, sin paternalismo

---

## 4. Principios de Diseño

### P1 — La Música es el Centro
La interfaz no compite con el contenido. El artwork de un álbum debe poder "respirar". Los controles de reproducción no deben distraer mientras se muestra información.

### P2 — Densidad con Jerarquía
Inspirado en los equipos Hi-Fi profesionales: mucha información disponible, pero con una jerarquía visual perfecta. El usuario sabe dónde mirar. No hay que simplificar ocultando; hay que organizar exponiendo.

### P3 — Feedback Físico / Analógico
Las interacciones deben tener peso. Botones que parecen presionarse, sliders que tienen resistencia visual, transiciones que tienen inercia. Framer Motion se usa para simular física, no para decorar.

### P4 — Oscuridad Funcional
El dark mode no es una preferencia: es el estado natural. Las superficies oscuras reducen la fatiga en sesiones largas de curación musical. La oscuridad debe tener profundidad (varios niveles de negro/gris), nunca ser plana.

### P5 — Precisión sobre Perfección Visual
Si un metadato existe, se muestra. La app no "suaviza" la realidad para verse más limpia. Un BPM incorrecto en los datos es un BPM incorrecto en la UI. La honestidad técnica es un valor de diseño.

### P6 — Economía de Color
El color tiene rol semántico, no decorativo. Se usa para estado (activo, descargando, error), no para embellecer. La paleta cromática es restringida y disciplinada.

---

## 5. Paleta de Colores Principal

La paleta principal se inspira en las consolas de mezcla Neve y SSL, el Tidal HiFi brand, y las interfaces de Winamp Dark 2.0.

```
┌─────────────────────────────────────────────────────────────┐
│  FONDOS Y SUPERFICIES                                       │
├──────────────────┬──────────────┬───────────────────────────┤
│  Nombre          │  HEX         │  Uso                      │
├──────────────────┼──────────────┼───────────────────────────┤
│  Void            │  #080B0F     │  Fondo base de la app     │
│  Abyss           │  #0D1117     │  Fondo de paneles         │
│  Console         │  #131920     │  Superficie de cards      │
│  Studio          │  #1A2330     │  Superficie elevada       │
│  Rack            │  #21303F     │  Hover / seleccionado     │
└──────────────────┴──────────────┴───────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TEXTOS                                                     │
├──────────────────┬──────────────┬───────────────────────────┤
│  Signal White    │  #E8EFF5     │  Texto primario           │
│  Mist            │  #8FA3B8     │  Texto secundario         │
│  Slate           │  #4D6278     │  Texto deshabilitado      │
│  Ghost           │  #2C3E50     │  Placeholder / faint text │
└──────────────────┴──────────────┴───────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ACENTO PRINCIPAL — TEAL ANALÓGICO                          │
├──────────────────┬──────────────┬───────────────────────────┤
│  Teal 500        │  #00C9A7     │  Acento principal, CTA    │
│  Teal 400        │  #00E5BF     │  Hover state              │
│  Teal 300        │  #4DFFD9     │  Active / focus ring      │
│  Teal 700        │  #008C73     │  Pressed state            │
│  Teal Glow       │  #00C9A720   │  Glow / shadow semántica  │
└──────────────────┴──────────────┴───────────────────────────┘
```

**Ratio de contraste mínimo:** 4.5:1 para texto sobre superficies (WCAG AA).

---

## 6. Paleta Secundaria

```
┌─────────────────────────────────────────────────────────────┐
│  ESTADO Y SEMÁNTICA                                         │
├──────────────────┬──────────────┬───────────────────────────┤
│  VU Green        │  #39D353     │  Descarga completada / OK │
│  VU Amber        │  #E8A020     │  Warning / pausado        │
│  VU Red          │  #E84040     │  Error / clip             │
│  Download Blue   │  #3B82F6     │  En progreso              │
│  Queue Purple    │  #8B5CF6     │  En cola / pendiente      │
└──────────────────┴──────────────┴───────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SYNTHWAVE — USO RESTRINGIDO                                │
├──────────────────┬──────────────┬───────────────────────────┤
│  Retro Magenta   │  #E040FB     │  Solo para highlights     │
│  Retro Blue      │  #40C4FF     │  Solo para highlights     │
│  Retro Pink      │  #FF4081     │  Nunca como fondo         │
└──────────────────┴──────────────┴───────────────────────────┘
```

> **Regla de uso Synthwave:** Los colores retro solo aparecen como acento de un único elemento por pantalla, nunca combinados entre sí, nunca como relleno de superficies. Dosis homeopáticas.

```
┌─────────────────────────────────────────────────────────────┐
│  BORDES Y SEPARADORES                                       │
├──────────────────┬──────────────┬───────────────────────────┤
│  Border Default  │  #1E2D3D     │  Bordes de cards          │
│  Border Subtle   │  #162030     │  Divisores internos       │
│  Border Focus    │  #00C9A750   │  Focus ring con teal      │
└──────────────────┴──────────────┴───────────────────────────┘
```

---

## 7. Tipografías

### Display — Logotipo y Títulos Grandes

**Geist Mono** (Vercel / Google Fonts)
- Uso: Nombre de la app, títulos de sección principales, contadores técnicos (bitrate, kHz, BPM)
- Peso: 600–700
- Tracking: `0.02em`
- Justificación: Legibilidad en pantalla, ADN técnico, relación con terminales y consolas de audio

```
MUSIC 4 ALL          ← Geist Mono 700, tracking 0.04em
──────────────────
Bitrate: 1411 kbps   ← Geist Mono 500
```

### UI Principal — Navegación y Etiquetas

**Inter** (Google Fonts)
- Uso: Navegación, botones, etiquetas, metadatos cortos
- Pesos: 400 (body), 500 (labels), 600 (emphasis)
- Tracking: `0` a `0.01em`
- Justificación: La fuente de referencia para UIs de alta densidad informativa

### Cuerpo y Metadatos Largos

**Inter** (mismo)
- Uso: Descripciones de álbumes, notas de liner, texto extendido
- Peso: 400
- Line height: `1.6`
- Max-width en prosa: `65ch`

### Código y Rutas de Archivo

**JetBrains Mono** (Google Fonts)
- Uso: Rutas de descarga, comandos CLI en la UI, JSON preview de metadatos
- Peso: 400
- Background: Surface `Console` (#131920)

### Escala Tipográfica (rem base = 16px)

```
display-2xl  →  3.0rem  / 700  / Geist Mono   — Pantalla de bienvenida
display-xl   →  2.25rem / 700  / Geist Mono   — Nombre de álbum hero
display-lg   →  1.875rem/ 600  / Geist Mono   — Sección H1
heading-md   →  1.25rem / 600  / Inter        — Card title, panel header
heading-sm   →  1.0rem  / 600  / Inter        — Subsección, etiqueta
body-lg      →  1.0rem  / 400  / Inter        — Cuerpo principal
body-md      →  0.875rem/ 400  / Inter        — Metadatos, descripciones
body-sm      →  0.75rem / 400  / Inter        — Captions, timestamps
label-xs     →  0.625rem/ 500  / Geist Mono   — Badges técnicos (FLAC, HiRes)
```

---

## 8. Iconografía

### Sistema de Iconos Base

**Lucide Icons** + iconos custom para audio/música.

Lucide es la librería de referencia porque:
- Stroke-based: se escala sin perder definición
- Line weight consistente (1.5px stroke por defecto)
- Estilo que combina con Geist Mono sin competir

### Tamaños Estándar

```
xs   →  12px  — Inline con texto muy pequeño
sm   →  16px  — Dentro de campos de formulario
md   →  20px  — Botones, nav items
lg   →  24px  — Acciones principales
xl   →  32px  — Empty states, onboarding
2xl  →  48px  — Ilustraciones de estado
```

### Iconos Especiales de Audio (Custom SVG)

Estos iconos deben diseñarse custom, inspirados en paneles de hardware:

| Icono | Concepto | Inspiración |
|---|---|---|
| Waveform | Visualizador de audio activo | Osciloscopio analógico |
| VU Meter | Indicador de nivel | Consola Neve 8078 |
| Reel | Cola de descarga | Grabadora de cinta |
| Rack Unit | Contenedor de formato | Rack 19" |
| Needle | Reproduciendo | Cabezal de vinilo |
| Crossfade | Transición de pistas | Fade out en DJ mixer |

### Reglas de Uso

- Los iconos de estado de reproducción (play, pause, stop) usan Teal 500 cuando están activos.
- Iconos deshabilitados: `opacity-30`, no cambio de color.
- Nunca usar relleno (filled) y stroke mezclados en la misma pantalla.
- Touch target mínimo: 44×44px (incluye padding invisible).

---

## 9. Estilo de Ilustraciones

Music 4 All usa un enfoque de **ilustración técnica contenida**, no ilustración editorial decorativa. Las imágenes deben sentirse como diagramas de un manual de estudio de grabación, no como stickers.

### Estilo de Empty States e Ilustraciones de Onboarding

**Línea técnica + Synthwave sutil**
- Trazo principal: `#00C9A7` (Teal 500) sobre fondo oscuro
- Grid de perspectiva suave en background: `#1A2330` con líneas en `#21303F`
- Elementos 3D isométricos con rendering de arista (wireframe con fill oscuro)
- Sin gradientes de arcoiris, sin colores saturados como protagonistas

**Referentes visuales:**
- Manual técnico de Neve 1073
- Diagramas de síntesis de sintetizadores modulares
- Visuales de Kraftwerk (geométrico, preciso, tecnológico)

### Cuando usar ilustraciones

| Contexto | Ilustración |
|---|---|
| Empty state — sin canciones | Aguja de tocadiscos sobre vinilo vacío (line art) |
| Error de conexión | Cable de audio desconectado (jack 6.35mm) |
| Descarga completada | Carrete de cinta lleno, teal glow sutil |
| Sin resultados de búsqueda | Osciloscopio plano (señal en cero) |
| Onboarding — conectar Tidal | Puerto HDMI/USB rodeado de iconos de audio |

### Fotografía y Artwork

- El artwork de álbumes se muestra siempre sin filtros, sin bordes redondeados extremos (max `border-radius: 4px`).
- Never usar artwork como fondo con blur masivo: crea ruido visual que compite con el contenido.
- Si se usa como fondo, degradé muy sutil desde la esquina inferior, `opacity: 0.08` máximo.

---

## 10. Uso de Sombras

Las sombras comunican **elevación física**, como los distintos planos de un rack de audio. Nunca son decorativas.

### Sistema de Elevación

```css
/* Nivel 0 — Superficie base, sin sombra */
--shadow-none: none;

/* Nivel 1 — Cards, tooltips */
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.4),
             0 1px 2px 0 rgba(0, 0, 0, 0.3);

/* Nivel 2 — Paneles flotantes, dropdowns */
--shadow-md: 0 4px 12px 0 rgba(0, 0, 0, 0.5),
             0 2px 4px 0 rgba(0, 0, 0, 0.4);

/* Nivel 3 — Modales, drawers */
--shadow-lg: 0 10px 30px 0 rgba(0, 0, 0, 0.6),
             0 4px 8px 0 rgba(0, 0, 0, 0.4);

/* Nivel 4 — Elemento sobre overlay */
--shadow-xl: 0 20px 50px 0 rgba(0, 0, 0, 0.7),
             0 8px 16px 0 rgba(0, 0, 0, 0.5);

/* Semántica — Elemento activo/reproduciendo */
--shadow-teal: 0 0 0 1px rgba(0, 201, 167, 0.3),
               0 4px 20px 0 rgba(0, 201, 167, 0.15);

/* Semántica — Error */
--shadow-red:  0 0 0 1px rgba(232, 64, 64, 0.3),
               0 4px 12px 0 rgba(232, 64, 64, 0.12);
```

### Reglas de Sombra

- Las sombras van siempre hacia abajo (no laterales, no omni-direccionales).
- Nunca usar `box-shadow: 0 0 X Y color` sin dirección como sombra de elevación (eso es glow, no elevación).
- Los fondos oscuros ya crean contraste; la sombra refuerza, no reemplaza.

---

## 11. Uso de Efectos Neón / Glow

El glow existe, pero es disciplinado. Funciona como el LED verde de un equipo Hi-Fi encendido: pequeño, preciso, significativo. No es decoración. Es estado.

### Cuándo Usar Glow

| Contexto | Color | Intensidad |
|---|---|---|
| Pista actualmente reproduciéndose | Teal | Baja |
| Botón de descarga en progreso | Blue | Media |
| Indicador de nivel de audio (VU) | Green → Amber → Red | Dinámica |
| Input con focus | Teal | Muy baja (solo border) |
| Error crítico | Red | Baja |
| Badge "HiRes" en calidad máxima | Teal | Muy baja |

### Implementación en CSS/Tailwind

```css
/* Glow teal — elemento activo */
.glow-active {
  box-shadow: 0 0 8px 0 rgba(0, 201, 167, 0.4),
              0 0 24px 0 rgba(0, 201, 167, 0.15);
}

/* Glow de texto — solo para el nombre de la pista activa */
.glow-text-active {
  text-shadow: 0 0 12px rgba(0, 201, 167, 0.6);
}

/* Glow de error */
.glow-error {
  box-shadow: 0 0 8px 0 rgba(232, 64, 64, 0.35);
}
```

### Límites Absolutos

- Máximo **2 elementos con glow activo simultáneamente** en la misma vista.
- El glow nunca cubre más del 30% del área visible de un elemento.
- En mobile/tablet: reducir intensidad al 60% por limitaciones de rendering.
- Nunca aplicar glow a texto mayor a `heading-md` (el efecto se vuelve noise visual).
- Prohibido: glow blanco, glow multicolor, glow animado con `pulse` rápido (< 2s).

---

## 12. Qué Elementos Evitar

### Evitar Siempre — Sin Excepciones

| Elemento | Por qué |
|---|---|
| Fondo completamente negro puro `#000000` | Crea halos y cansa la vista; usar Void `#080B0F` |
| Gradientes de múltiples colores vibrantes | Cyberpunk exagerado, disonante con el tono Hi-Fi |
| Bordes redondeados > 12px en cards | Pierde el carácter técnico/profesional |
| Animaciones de carga con spinners de colores | Usar barras de progreso horizontales estilo consola |
| Notificaciones push automáticas | El usuario controla la descarga, no al revés |
| Tipografía cursiva o handwriting | Rompe el ADN técnico |
| Emojis en la UI funcional | Solo aceptables en mensajes de estado vacío con moderación |
| Glow de colores Synthwave como Magenta o Pink | Solo acento puntual, nunca en elementos funcionales |
| Imágenes de fondo con baja opacidad + blur (glassmorphism extremo) | Reduce legibilidad, confunde jerarquía |
| Animaciones de bounce o elastic en acciones funcionales | Reservar para micro-celebraciones opcionales |
| Cards con sombras de colores saturados | Excepto las sombras semánticas definidas |
| Iconos rellenos (filled) mezclados con outline | Consistencia absoluta de estilo de icono |
| Sliders de audio con thumb circular grande | Usar thumb estilo "fader de consola" |
| Texto completamente en mayúsculas en cuerpo | Solo permitido en labels técnicas (FLAC, HiRes, TIDAL) |

### Patrones de Interacción a Evitar

- **Onboarding con 5+ pantallas de tour**: La app es para power users, no necesitan tutoriales.
- **Confirmaciones redundantes**: "¿Seguro que quieres descargar?" — No. Solo para acciones destructivas.
- **Loading states sin información**: Mostrar siempre progreso cuantificable (%, MB/s, tiempo restante).
- **Menus anidados de más de 2 niveles**: La jerarquía de navegación debe ser plana.

---

## 13. Ejemplos de Interfaces Ideales

### 13.1 — Pantalla Principal (Dashboard / Library View)

```
┌────────────────────────────────────────────────────────────────┐
│ ■ MUSIC 4 ALL          [Geist Mono, Teal accent]               │
├─────────────┬──────────────────────────────────────────────────┤
│             │                                                  │
│  NAV        │   MY LIBRARY                         [Grid/List] │
│  ─────────  │   ──────────────────────────────────────────     │
│  Library    │   ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐       │
│  Downloads  │   │ ART  │  │ ART  │  │ ART  │  │ ART  │       │
│  History    │   │      │  │      │  │      │  │      │       │
│  Settings   │   └──────┘  └──────┘  └──────┘  └──────┘       │
│             │   Album Name  Album Name  Album Name  ...        │
│  ─────────  │   Artist      Artist      Artist                 │
│  TIDAL      │   FLAC 24bit  FLAC 16bit  MP3 320    ...        │
│  ● Connected│                                                  │
│             │   ┌──────┐  ┌──────┐  ┌──────┐                 │
│             │   │ ART  │  │ ART  │  │ ART  │                 │
│             │   └──────┘  └──────┘  └──────┘                 │
├─────────────┴──────────────────────────────────────────────────┤
│ ▶  TRACK TITLE                       [=====●────] 2:34 / 4:12 │
│    Artist · Album                     ♥  ↓  ···   Vol: ██▓▒░  │
└────────────────────────────────────────────────────────────────┘
```

**Principios aplicados:** Sidebar dark `Abyss`, grid de artwork con `4px` border-radius, player bar con fondo `Void`, indicador de conexión Tidal en `VU Green`.

---

### 13.2 — Vista de Álbum (Album Detail)

```
┌────────────────────────────────────────────────────────────────┐
│ ← Back                                        [Download All ↓] │
├─────────────────────┬──────────────────────────────────────────┤
│                     │                                          │
│   ┌─────────────┐   │  ALBUM TITLE                [Geist 700] │
│   │             │   │  Artist Name                            │
│   │   ARTWORK   │   │  2023 · 12 tracks · 52:14 · FLAC 24bit │
│   │   400×400   │   │                                         │
│   │             │   │  ─────────────────────────────────────  │
│   └─────────────┘   │  #   TITLE             DURATION   QUAL  │
│                     │  ─────────────────────────────────────  │
│   Quality: HiRes    │  ● 1  Track Name       4:12       FLAC  │
│   24bit / 192kHz    │    2  Track Name       3:45       FLAC  │
│   Codec: FLAC       │    3  Track Name       5:01       FLAC  │
│   Bitrate: 4608kbps │    4  Track Name       4:33       FLAC  │
│                     │    5  Track Name       6:12       FLAC  │
│   Label: XL Rec.    │    6  Track Name       3:58       FLAC  │
│   UPC: 5099900...   │    7  Track Name       4:44       FLAC  │
│                     │    ·  ···                               │
└─────────────────────┴──────────────────────────────────────────┘
```

**Principios aplicados:** Artwork sin filtros, metadatos técnicos completos visibles, track list densa con jerarquía clara. La pista activa tiene `glow-active` en el número de pista.

---

### 13.3 — Panel de Descargas (Download Queue)

```
┌────────────────────────────────────────────────────────────────┐
│  DOWNLOAD QUEUE                        Active: 3 · Queue: 8   │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ● Downloading                                    2.4 MB/s│  │
│  │  Album Name — Track Title.flac                          │  │
│  │  [████████████████████░░░░░░░░░░░░░░░]  56%  1:24 left  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ● Downloading                                    1.8 MB/s│  │
│  │  Album Name 2 — Track Title.flac                        │  │
│  │  [████████░░░░░░░░░░░░░░░░░░░░░░░░░░░]  23%  3:10 left  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ✓ Completed                                              │  │
│  │  Album Name 3 — Track Title.flac          FLAC 24bit ↗  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  IN QUEUE:                                                     │
│  ─ Track 4 · Track 5 · Track 6 · + 5 more                     │
└────────────────────────────────────────────────────────────────┘
```

**Principios aplicados:** Barras de progreso horizontales estilo consola, información cuantificable (MB/s, tiempo restante, %), estados semánticos con color (Teal = activo, VU Green = completado).

---

### 13.4 — Pantalla de Autenticación (Login)

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│                                                                │
│                    ■ MUSIC 4 ALL                              │
│                  [Geist Mono 700, Teal]                       │
│                                                                │
│              ──────────────────────────────                   │
│              Connect your TIDAL account                       │
│                                                                │
│              ┌──────────────────────────┐                     │
│              │  username@email.com       │  [Inter 400]       │
│              └──────────────────────────┘                     │
│                                                                │
│              ┌──────────────────────────┐                     │
│              │  ••••••••••••••          │                     │
│              └──────────────────────────┘                     │
│                                                                │
│              ┌──────────────────────────┐                     │
│              │  CONNECT TO TIDAL        │  [Teal fill]        │
│              └──────────────────────────┘                     │
│                                                                │
│              Powered by TIDAL HiFi API                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Principios aplicados:** Composición centrada minimalista, inputs sin bordes redondeados extremos (`4px`), único elemento de color es el CTA principal, tipografía monoespacio para el logotipo.

---

### 13.5 — Mini Player Bar (Player Persistente)

```
┌────────────────────────────────────────────────────────────────┐
│ ┌──────┐  ● Track Title                    ──────●────  3:45  │
│ │ ART  │    Artist · Album · FLAC 24bit    ◄◄  ▐▐  ►   4:12  │
│ └──────┘    ♥ Like    ↓ Save               Vol: ████▓░        │
└────────────────────────────────────────────────────────────────┘
      ↑ Artwork 48×48px     ↑ Metadata denso   ↑ Controls compactos
      Border-radius: 4px    ↑ Glow en dot      Slider estilo fader
```

**Principios aplicados:** Artwork pequeño con información densa, controles de reproducción con iconografía de stroke, indicador de reproducción con glow teal sutil, volumen como fader horizontal.

---

## Resumen de Tokens de Diseño

```typescript
// design-tokens.ts — para Tailwind config
export const tokens = {
  colors: {
    void:     '#080B0F',
    abyss:    '#0D1117',
    console:  '#131920',
    studio:   '#1A2330',
    rack:     '#21303F',
    
    signal:   '#E8EFF5',
    mist:     '#8FA3B8',
    slate:    '#4D6278',
    ghost:    '#2C3E50',
    
    teal:     { 300: '#4DFFD9', 400: '#00E5BF', 500: '#00C9A7', 700: '#008C73' },
    
    vuGreen:  '#39D353',
    vuAmber:  '#E8A020',
    vuRed:    '#E84040',
    dlBlue:   '#3B82F6',
    qPurple:  '#8B5CF6',
  },
  
  fontFamily: {
    mono:   ['Geist Mono', 'JetBrains Mono', 'monospace'],
    sans:   ['Inter', 'system-ui', 'sans-serif'],
    code:   ['JetBrains Mono', 'monospace'],
  },
  
  borderRadius: {
    sm:   '2px',
    md:   '4px',
    lg:   '8px',
    xl:   '12px',
    full: '9999px',
  },
  
  spacing: {
    rack: '8px',  // unidad base del sistema, como una unidad de rack (1U)
  },
}
```

---

*Music 4 All Brand Identity v1.0 · Generado en Junio 2026*  
*Revisar y actualizar cuando se realicen cambios significativos en la UI o posicionamiento del producto.*
