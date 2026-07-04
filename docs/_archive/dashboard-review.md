# Music 4 All — Dashboard Design Review

> Versión 1.0 · Junio 2026  
> Reviewer: Principal Product Designer / UX Architect  
> Documento evaluado: `docs/wireframes-dashboard.md`  
> Referencias: `docs/brand-identity.md` · `docs/design-system.md` · `docs/frontend-architecture.md`

---

## Índice

1. [Metodología de revisión](#1-metodología-de-revisión)
2. [Evaluación: Claridad visual](#2-evaluación-claridad-visual)
3. [Evaluación: Jerarquía de información](#3-evaluación-jerarquía-de-información)
4. [Evaluación: Flujo de descarga](#4-evaluación-flujo-de-descarga)
5. [Evaluación: Escalabilidad futura](#5-evaluación-escalabilidad-futura)
6. [Consistencia con Brand Identity](#6-consistencia-con-brand-identity)
7. [Consistencia con Design System](#7-consistencia-con-design-system)
8. [Consistencia con Frontend Architecture](#8-consistencia-con-frontend-architecture)
9. [Riesgos UX críticos](#9-riesgos-ux-críticos)
10. [Elementos redundantes](#10-elementos-redundantes)
11. [Oportunidades de mejora](#11-oportunidades-de-mejora)
12. [Funcionalidades futuras que el diseño debe anticipar](#12-funcionalidades-futuras-que-el-diseño-debe-anticipar)
13. [Veredito y prioridad de cambios](#13-veredito-y-prioridad-de-cambios)

---

## 1. Metodología de Revisión

Esta revisión asume la postura de un revisor externo que no diseñó los wireframes. Cada hallazgo está referenciado a una fuente concreta: ya sea una sección de los documentos base o un principio de UX establecido. Los hallazgos están clasificados por severidad:

- **[CRÍTICO]** — Rompe funcionalidad o viola un principio documentado. Debe resolverse antes de implementar.
- **[MAYOR]** — Crea fricción significativa o inconsistencia con los documentos base. Debe resolverse en el mismo sprint de diseño.
- **[MENOR]** — Oportunidad de mejora clara. Puede resolverse en iteración posterior.
- **[OBSERVACIÓN]** — Punto de atención para decisiones futuras. No requiere acción inmediata.

---

## 2. Evaluación: Claridad Visual

### Lo que funciona bien

La leyenda de notación es exhaustiva y coherente. La jerarquía de superficies (void → abyss → console → studio → rack) se aplica consistentemente en todos los wireframes. El empty state (Estado A) es limpio y comunica claramente el único action path disponible.

### Problemas identificados

**[MAYOR] El área de contenido tiene tres zonas visuales sin jerarquía clara entre sí**

En los estados con descarga activa (E, F), el content area tiene: zona de búsqueda (arriba), zona de resultados (medio), zona de descargas (abajo). El usuario debe hacer scroll para ver los resultados si hay descargas activas. No hay separación visual definida entre estas tres zonas. No existe en el Design System un "divider de zona de contenido" — solo `border-subtle` para divisores internos de componentes. La zona de descargas se confunde con una card expandida.

**[MENOR] El Estado B (URL preview) y el Estado D (detail panel) son visualmente similares pero arquitectónicamente distintos**

Ambos muestran: artwork + título + artista + metadatos + track list + badges de calidad + CTA de descarga. El usuario que usa URL preview por primera vez y luego abre un album card desde el grid verá casi la misma interfaz. Esta similitud puede generar confusión sobre si son el mismo componente o si tienen comportamientos distintos (efectivamente, sí los tienen: State B no permite descarga individual de tracks, State D sí).

**[MENOR] El toggle Grid/List (⊞≡) nunca se wireframea en modo lista**

El wireframe diseña el modo grid en detalle (Estado C) pero el documento no incluye el wireframe de modo lista. Dado que el Design System define `album-list` como una variante del componente Card, el wireframe de lista debería estar presente. La ausencia crea un diseño incompleto que el implementador deberá inventar.

---

## 3. Evaluación: Jerarquía de Información

### Lo que funciona bien

El input de búsqueda como hero del Estado A es correcto. La detección de tipo ("URL detected — Album") en `teal-500` es visualmente diferenciadora sin ser estridente. El sistema de tabs con counts (Albums (8) / Tracks (23)) da visibilidad inmediata sin requerir navegación.

### Problemas identificados

**[CRÍTICO] El panel de descargas consume altura de forma no predecible y no controlada**

Cálculo real de alturas en viewport 900px con 3 jobs activos (Estado F):

```
Player bar permanente:     80px
Download panel header:     40px
Job C (completo):         ~100px  (2 líneas + barra + porcentaje + gap)
Job D (completo):         ~100px
Job E en cola (completo):  ~80px  
─────────────────────────────────
Panel + player total:      400px
Área disponible para contenido: 500px
Sidebar: fijo 240px
Área útil de contenido: 500px altura × 1160px ancho

Con 5 columnas de grid: cards de ~210px ancho
Card height: ~250px (imagen 210×210 + info 40px)
Solo cabe 2 filas en 500px de altura
```

El usuario ve solo 10 cards máximo mientras tiene descargas activas. Con el input de búsqueda arriba, quedan ~440px reales para el grid: caben 1.7 filas. Esto es claramente insuficiente para una sesión de exploración activa.

**[MAYOR] La jerarquía entre "título de track activo" y "nombre del álbum" en el panel de descarga es invertida respecto al design system**

El wireframe muestra:
```
● Downloading  OK Computer — Radiohead   [línea primaria]
Airbag.flac                             [línea secundaria]
```

Pero desde el punto de vista del usuario, el dato más útil en tiempo real es el **track que se está descargando ahora**, no el álbum. El álbum ya lo sabe (lo inició él). El track current es la información de granularidad que indica progreso real. La jerarquía tipográfica debería ser: track actual como línea primary, álbum como contexto secondary.

**[MENOR] El Sidebar muestra 5 ítems de navegación de igual peso visual**

Dashboard, Library, Downloads, History, Settings tienen exactamente el mismo tratamiento tipográfico e icónico. Sin embargo, Library y Downloads son las features core del producto. Dashboard es un hub de acceso rápido. History y Settings son features secundarias. Una jerarquía visual sutil (grupo primario / separador / grupo secundario) dentro del sidebar comunicaría mejor la estructura de la app.

---

## 4. Evaluación: Flujo de Descarga

### Lo que funciona bien

El flujo URL → Preview → Download es el path más limpio del diseño. La URL detection on paste es el patrón correcto. Los badges de calidad en la preview dan la confirmación técnica necesaria antes de iniciar.

### Problemas identificados

**[CRÍTICO] Estado intermedio entre URL paste y preview no está diseñado**

El wireframe va directamente de "pegar URL" a "preview card completa con artwork, tracks y metadatos". En realidad, entre esos dos momentos hay una llamada API al backend (que a su vez llama a Tidal). Esta llamada puede tardar 1-3 segundos.

No existe un wireframe del estado de loading durante la resolución de la URL. El documento dice "Mientras carga: skeleton `surface-rack`" solo para el artwork, pero no especifica el estado del resto de la card, el input, ni la etiqueta "URL detected" mientras se espera la respuesta.

**[CRÍTICO] Estado B y Estado D tienen comportamientos de descarga inconsistentes para el mismo dato**

Estado B (URL preview):
> "La lista es solo lectura aquí — no tiene controles de selección individual. Al hacer clic en Download se descarga el álbum completo."

Estado D (detail panel del mismo álbum):
> "Hover sobre una fila: fondo surface-rack + aparece un botón '↓' trailing para descargar esa pista individual."

El usuario que pega la URL de "OK Computer" ve la track list pero no puede seleccionar tracks. El usuario que llega al mismo álbum por búsqueda de texto y abre el detail panel sí puede seleccionar tracks individuales. **El mismo dato, dos comportamientos distintos, sin justificación de diseño documentada.** Esto viola el Principio P1 de la Arquitectura: consistencia de comportamiento.

**[MAYOR] La confirmación de calidad antes de descargar nunca es visible desde el flujo rápido**

En el hover overlay (Estado C) se puede iniciar una descarga directa sin ver qué calidad se usará. El wireframe dice "calidad configurada en Settings" pero el usuario no recibe ninguna confirmación de qué calidad está a punto de descargar. Para un audiófilo que tiene Settings en "High" cuando realmente quería "Master" para ese álbum específico, esto es un error costoso (tiempo + storage). La calidad debe ser visible o configurable inline antes de confirmar.

**[MAYOR] El flujo de error no tiene un camino claro hacia la resolución**

En Estado G, el toast ofrece "Check Session" que "abre el modal de estado de conexión con Tidal". Pero ese modal no está wireframeado. El usuario hace clic en "Check Session" y no se sabe qué ve. Si la sesión expiró, ¿el modal inicia un nuevo Device Auth? ¿O solo muestra el estado? El path de recovery es el momento más crítico del flujo y está sin especificar.

**[MENOR] No hay estado de "descarga completada" visible en el dashboard**

Cuando un job termina, el wireframe dice que desaparece del panel después de 3 segundos con "barra de progreso → verde, fade out". El usuario no tiene confirmación durable de que el archivo está en su sistema. ¿Dónde fue? Un estado de "Completed" con un link "↗ Show in folder" o "↗ Open file" añadiría la confirmación final que el audiófilo necesita.

**[MENOR] La barra de progreso muestra porcentaje del álbum completo, no del track actual**

El wireframe especifica: "El porcentaje es del álbum completo (tracks completados / total), no del track individual." Esto significa que si el álbum tiene 10 tracks de 5 minutos cada uno, el porcentaje sube en incrementos del 10% exacto cuando cada track termina. La barra parece "congelada" durante la descarga de cada track y salta al terminar. Una barra compuesta (porcentaje de tracks completados + progreso del track actual dentro del siguiente 10%) sería más informativa y se vería más "viva".

---

## 5. Evaluación: Escalabilidad Futura

### Lo que funciona bien

El panel de detalle como drawer lateral (Estado D) es un patrón que puede escalar: a medida que se añadan más metadatos (liner notes, credits, Dolby Atmos info), el panel simplemente crece verticalmente con scroll interno. El sistema de tabs en el panel es extendible.

### Problemas identificados

**[MAYOR] El player bar no tiene espacio reservado para controles futuros**

El player bar en su estado actual ocupa 80px para: artwork (48px) + track info + controles básicos (prev/play/next) + slider de progreso + volumen. No hay espacio para funciones que son naturales en v2: shuffle, repeat, queue icon, bitrate indicator, output device selector, equalizer shortcut. Añadir cualquiera de estos requeriría rediseñar el player bar completo o aumentar su altura.

**[MAYOR] El download panel no tiene mecanismo de priorización de jobs**

La cola es estrictamente FIFO. En un escenario realista: el usuario tiene 3 álbumes en descarga y agrega un single de emergencia que quiere ahora. No puede reordenar la cola. El panel no tiene drag handles ni botones de "mover arriba/abajo". Añadirlos en una iteración futura requeriría repensar el layout del panel.

**[OBSERVACIÓN] El sidebar de 240px no tiene estrategia de colapso**

En versiones futuras, si se añaden más secciones al sidebar (Devices, Playlists locales, Favoritos), 240px de ancho fijo se vuelve insuficiente o demasiado grande. El wireframe no plantea un sidebar colapsable (solo iconos) ni un sidebar expandible a 320px. La falta de esta estrategia puede forzar un rediseño completo cuando el sidebar crezca.

**[OBSERVACIÓN] No se contempla soporte multi-servicio**

El diseño está construido alrededor de Tidal exclusivamente. Si en el futuro se añade soporte a Qobuz o Apple Music Lossless, la URL detection del Estado B necesitaría identificar el servicio de origen. La etiqueta "URL detected — Album" debería poder convertirse en "TIDAL · Album" o "Qobuz · Album". Este cambio sería aditivo y no requiere rediseño, pero debería anticiparse en la lógica del label.

---

## 6. Consistencia con Brand Identity

### Violaciones identificadas

**[CRÍTICO] El límite de glow simultáneo se viola en Estado F**

Brand Identity, sección 11: "Máximo 2 elementos con glow activo simultáneamente en la misma vista."

Estado F tiene 2 jobs activos (dots ● con `glow-download` animado) + 1 job en queue (sin glow) = 2 glows. Esto cumple el límite. **Sin embargo**, si el player bar está reproduciendo simultáneamente, el dot ● de la pista activa añade `glow-active`. Total: 3 glows simultáneos. Esta combinación viola la regla.

La solución no está especificada: ¿Se desactiva el glow del player cuando hay descargas activas? ¿Se reduce el glow de los jobs de descarga cuando el player está activo? El wireframe no lo aborda.

**[MAYOR] El badge "Master Quality (MQA)" viola el límite de longitud de badge**

Brand Identity no especifica un límite de texto en badges. Sin embargo, Design System sección 3.6 sí: "El texto de badge nunca supera 8 caracteres."

"Master Quality (MQA)" = 19 caracteres. Es una violación directa. La alternativa: usar solo "MQA" (3 chars) o "MASTER" (6 chars) como badge, con el nombre completo en el tooltip.

**[MAYOR] El panel de descargas tiene un nivel de superficie no definido en el sistema**

Brand Identity sección 4 (P4): "La oscuridad debe tener profundidad (varios niveles de negro/gris), nunca ser plana."

El panel de descargas usa `surface-console` como fondo. Las cards de job dentro del panel también deberían usar una superficie elevada respecto al panel. Pero `surface-console` ya es el nivel 3 de la escala (void → abyss → console → studio → rack). El panel de job debería ser `surface-studio`. El wireframe no especifica la superficie de los job items individuales dentro del panel — los wireframes los muestran con el mismo `▓` que el panel contenedor.

**[MENOR] El Estado A muestra una ilustración pero no especifica si tiene animación de entrada**

Brand Identity sección 9: "Sin animación en reposo (la animación de la aguja solo ocurre cuando hay reproducción activa)." 

El wireframe cumple esta restricción para la ilustración en reposo. Pero no especifica la animación de *entrada* al cargar la pantalla por primera vez. ¿La ilustración aparece con fade? ¿Con slide? Esto debería definirse.

---

## 7. Consistencia con Design System

### Violaciones identificadas

**[CRÍTICO] Contradicción interna en la altura del player bar**

Design System, sección 1.2, tabla de espaciados:
> `space-12` = 48px = "Altura de barra de player"

Design System, sección 1.2, tabla de Layout Fijo:
> `layout-player-h` = 80px

Dos valores diferentes para el mismo elemento. El wireframe usa 80px. ¿Cuál es el correcto? Esta contradicción debe resolverse en el Design System antes de implementar. 

**Evaluación:** `layout-player-h: 80px` parece el valor correcto para una barra con artwork 48×48px + dos líneas de texto + slider. El token `space-12` con descripción "Altura de barra de player" parece ser un error de asignación de significado semántico. La corrección es cambiar la descripción de `space-12` a algo más apropiado (padding interno de un componente, no la altura del player).

**[CRÍTICO] El Download Panel ocupa una categoría de elevación sin z-index definido**

Design System, sección 1.5:

```
z-sticky:   200  ← Player bar, header fijo, sidebar
z-overlay:  300  ← Backdrop de modal, drawer overlay
z-modal:    400  ← Modales, drawers
z-toast:    500  ← Notificaciones Toast
z-tooltip:  600  ← Tooltips
```

El Download Panel es un elemento que:
- Está fijo en relación al viewport (no scrollea con el contenido)
- Está encima del contenido pero debajo del Player Bar
- Aparece/desaparece dinámicamente

No existe un z-index apropiado en la escala actual. `z-sticky` (200) es para el Player Bar. El Download Panel debería ser `z-sticky` también, pero entonces ¿quién "gana" si se superponen? El sistema de z-index necesita un nivel adicional entre `z-raised` y `z-sticky`, o una clarificación de que el Download Panel es `z-sticky` igual que el Player Bar pero siempre renderizado sobre el contenido y debajo del Player Bar por orden DOM.

**[MAYOR] El Popover de "Cancel download" no está en el Design System**

El wireframe describe: "Cancel abre un Popover de confirmación pequeño." Sin embargo, el Design System define Modal, Toast, Tooltip pero **no define Popover** como componente. Popover y Tooltip son distintos: el Tooltip es solo lectura, el Popover tiene interactividad (botones). El componente falta en la sección 3 del Design System.

**[MAYOR] El radio del Download Panel viola el principio documentado**

El wireframe especifica: "sin `radius` en los bordes que toca los bordes del área (`radius-md` solo en los bordes internos visibles)."

Design System, sección 1.3: `radius-none` solo para "Separadores, barras de progreso." No existe una categoría de "panel que toca los bordes laterales" con `radius-none`. Esto es una excepción no documentada. Debe ser formalizada en el Design System o el panel debe usar `radius-md` en todos sus bordes con un borde explícito que lo separe del edge del viewport.

**[MAYOR] El atajo ⌘K no está en la tabla de keyboard shortcuts de Accesibilidad**

Design System, sección 5.2, tabla de atajos:
```
Space     → Play/Pause
←/→       → Pista anterior/siguiente
J/K       → Pista anterior/siguiente
↑/↓       → Volumen
Escape    → Cerrar modal
←→        → Navegar tabs
Enter/Sp  → Seleccionar item
⌘M        → Menú contextual
```

El atajo `⌘K` (abrir búsqueda), introducido en el wireframe, no aparece en esta tabla. El Design System es el documento canónico de atajos. El wireframe está añadiendo comportamiento que debería documentarse en la fuente de verdad.

**[MENOR] El placeholder del input usa dos "líneas visuales" que no corresponden al componente Input**

Design System sección 3.2 (Input): El placeholder es una única línea de texto en `text-ghost`. El wireframe muestra:
```
__ tidal.com/browse/album/... or "Radiohead OK Computer"
```
Un placeholder de esta longitud excede lo que razonablemente puede mostrarse en una línea en el input. El Design System no define placeholders multi-línea ni cómo manejar el truncado del placeholder.

---

## 8. Consistencia con Frontend Architecture

### Problemas identificados

**[MAYOR] El Download Panel widget no coincide con la arquitectura de widgets**

Architecture sección 4 define:
```
widgets/
  download-panel/
    DownloadPanel.tsx
    DownloadItem.tsx
    QueueList.tsx
```

El wireframe muestra el Download Panel como parte del área de contenido del Dashboard, empujando los resultados hacia arriba. Pero en la arquitectura, `download-panel` es un **widget** que puede aparecer en múltiples páginas. Si el widget es parte del layout del grupo `(app)/`, debería estar en el `(app)/layout.tsx`, no en `dashboard/page.tsx`. Si está en el layout, comparte posición con el Player Bar y el Sidebar — ¿dónde exactamente se monta? Esto no está definido ni en la arquitectura ni en los wireframes.

**[MAYOR] El estado del player en el wireframe no coincide con el modelo de datos del player store**

Architecture sección 7.2 define `player.store.ts` con:
```
queue: Track[]
queueIndex: number
```

El Player Bar en el wireframe muestra: artwork, nombre de pista, artista, álbum, controles. Esto requiere que el store tenga `currentTrack` con estos campos. Pero el wireframe del player bar muestra "Radiohead · OK Computer" como "Artista · Álbum", lo que implica que el Track entity incluye el nombre del álbum. El architecture document no especifica si el `Track` entity (en `entities/track/track.types.ts`) incluye el nombre del álbum padre. Esta dependencia necesita ser explícita.

**[MENOR] El panel de detalle (Estado D) es un drawer pero la arquitectura no define un componente Drawer**

La arquitectura define Sidebar, Modal, Toast, Tooltip como componentes. El panel lateral deslizable de 420px es funcionalmente un Drawer. El Design System sección 1.5 menciona "drawers laterales" con `radius-xl` y z-index `z-modal`, pero el componente Drawer no está en la sección 3 (Componentes Base). El wireframe crea un componente implícito que ningún documento define formalmente.

---

## 9. Riesgos UX Críticos

Los riesgos están ordenados por probabilidad × impacto.

---

### Riesgo 1 — Layout shift catastrófico al iniciar descargas [CRÍTICO]

**Descripción:** Cuando el usuario tiene resultados de búsqueda visibles y hace clic en "Download", el Download Panel aparece en la parte inferior del content area. Esto causa un reflow de toda la página: el grid de albums sube, las cards cambian de posición. Si el usuario estaba a punto de hacer clic en otra card, su click puede caer en el lugar incorrecto después del shift.

**Escenario concreto:** El usuario ve 10 album cards, hace clic en "OK Computer" para descargarlo, el panel aparece empujando el grid hacia arriba, la segunda fila de cards sube donde estaba la primera fila, y el usuario hace clic en "Amnesiac" pensando que está en "Pablo Honey".

**Solución recomendada:** Convertir el Download Panel en un **elemento de posición fija**, separado del flujo del contenido. No forma parte del content area — flota entre el contenido y el Player Bar, con su propio z-index. El contenido del scroll no cambia al aparecer o desaparecer el panel.

---

### Riesgo 2 — Ambigüedad de click target en Album Card [CRÍTICO]

**Descripción:** En el hover state de la Album Card, el área del artwork tiene dos comportamientos definidos que se superponen físicamente:
- Clic en artwork → abre Detail Panel (Estado D)
- Clic en overlay "↓ Download" → inicia descarga directa

El overlay cubre el 100% del artwork. ¿Cómo distingue el usuario que "clic en el overlay = descargar" vs "clic en el artwork = ver detalle"? No hay distinción visual clara: el overlay ES el artwork durante el hover.

**Impacto:** El usuario que quiere ver el detalle del álbum iniciará descargas involuntarias. El usuario que quiere descargar rápido verá el panel de detalle.

**Solución recomendada:** El clic en el **artwork** (debajo del overlay) siempre abre el detail panel. El botón "↓ Download" en el overlay es un botón real de tamaño limitado (no el overlay entero), centrado en el artwork pero con área de click delimitada (~80×40px). El resto del overlay es decorativo (oscurece la imagen) pero el click "cae al artwork" y abre el detail panel.

---

### Riesgo 3 — Vertical space collapse en viewport de 900px con descargas activas [MAYOR]

Cálculo exacto ya documentado en sección 3. La consecuencia práctica: el usuario que mantiene 2-3 descargas activas mientras busca más contenido solo ve 1-2 filas del grid en todo momento. Esto destruye la experiencia de exploración, que es la actividad principal del Dashboard.

**Solución recomendada:** Ver Riesgo 1 — el Download Panel fijo elimina este problema por completo.

---

### Riesgo 4 — El flujo de error no tiene resolución completa [MAYOR]

**Descripción:** El error 403 (sesión expirada) aparece en el panel y en el toast. El CTA "Check Session" está definido como "abre el modal de estado de conexión con Tidal". Este modal no está wireframeado. El usuario que hace clic ve algo que no existe en los documentos de diseño. Si ese modal inicia un Device Auth (lo más probable), hay una animación de pantalla, un código, una URL externa, y un polling de confirmación. Este sub-flujo entero está sin diseñar.

---

### Riesgo 5 — Doble feedback de error genera sobrecarga cognitiva [MAYOR]

**Descripción:** Cuando una descarga falla, el usuario recibe simultáneamente:
1. El job en el panel cambia a estado error (rojo, mensaje de error, botones Retry/Remove)
2. Un Toast de error aparece en bottom-right con el mismo mensaje + CTAs duplicados

Ambos elementos requieren atención, ambos muestran el mismo error, ambos ofrecen las mismas acciones. El toast necesita ser cerrado manualmente. El panel permanece visible. El usuario tiene que procesar la misma información en dos lugares y tomar una decisión de dónde actuar.

**Solución recomendada:** El error en el panel es suficiente como feedback persistente. El Toast solo debería aparecer si el panel de descargas **no está visible** (por ejemplo, el usuario está en otra página). Cuando el panel está en pantalla, el toast es redundante.

---

### Riesgo 6 — La calidad de descarga es opaca en el flujo rápido [MAYOR]

**Descripción:** El overlay "↓ Download" en Estado C inicia la descarga con "la calidad configurada en Settings". El usuario no ve qué calidad eso es en el momento del clic. Para un audiófilo que tiene configurado "High" (no "Master") por defecto para no llenar el disco, pero que para este álbum específico quiere "Master" — no tiene ningún mecanismo de override desde el flujo rápido. Debe ir a Settings, cambiar la calidad, descargar, y volver a cambiarla.

**Impacto:** Descargas con calidad incorrecta que el usuario no nota hasta revisar el archivo. Frustración y re-descarga.

---

### Riesgo 7 — Tres glows simultáneos violan la regla del Design System [MAYOR]

**Descripción:** Con el player reproduciendo (glow-active en el dot del player bar) + 2 jobs de descarga activos (glow-download en los dots del panel), hay 3 elementos con glow simultáneo. Design System sección 1.4: "Máximo 2 elementos con glow activo en la misma vista."

**Impacto:** La restricción existe para mantener el visual calmado y no-ansioso (Principio P6 de la Brand Identity). Tres glows animados simultáneamente producen el efecto contrario al deseado.

---

## 10. Elementos Redundantes

### R1 — El contador "Completed: 0" en el header del Download Panel

El header muestra "Active: 2 · Queue: 1 · Completed: 0". Un contador en 0 aporta cero información. Peor: cuando los jobs completan y se auto-eliminan después de 3 segundos, el contador brevemente muestra "Completed: 2" y luego desaparece — informando un estado que el usuario ya no puede ver. El contador debería aparecer solo cuando hay al menos 1 job completado, y debería convertirse en un botón "Clear 2 completed" en lugar de un número pasivo.

### R2 — Doble guía vacía: empty state del Dashboard + empty state del Player Bar

Estado A muestra:
> "Paste a URL or search to start downloading"  
> "Your downloads will appear here as they progress"

Player Bar simultáneamente muestra:
> "⊘ Nothing playing"  
> "Use search above or go to Library"

El Player Bar del Estado A repite el consejo de usar la búsqueda. El usuario lee lo mismo dos veces. El Player Bar en estado vacío debería ser más discreto: solo "⊘ Nothing playing" sin texto adicional. La guía de búsqueda ya está en el hero del content area.

### R3 — El botón "⌕ Search" y la tecla Enter son el mismo trigger

El wireframe tiene el botón Search como elemento UI separado a la derecha del input. En el Design System, la tecla Enter en un input de formulario ya hace submit. Para un power user, el botón es ruido visual. Para un mouse user, está bien tenerlo. **Sin embargo**, el botón consume espacio en el input que podría usarse para el hint de ⌘K. La solución es que el hint ⌘K reemplace al botón "⌕ Search" — el hint cumple ambas funciones: recordar el shortcut y actuar como botón clickeable para activar la búsqueda.

### R4 — El toast de error duplica todas las acciones del panel de descarga

Ya documentado en Riesgo 5. El toast tiene "Check Session" y "↻ Retry" — exactamente las mismas acciones que el panel de error del job. Un elemento es redundante.

### R5 — El label "IN QUEUE" en el badge del job en cola vs el dot ○

El job en cola tiene: dot ○ (vacío, `text-disabled`) + badge "IN QUEUE". El dot vacío ya comunica "no activo". El badge añade redundancia. Uno de los dos sobra. El dot ○ es suficiente; el badge podría reservarse para comunicar información adicional como "Starts in 3:14" (si se implementa descarga programada en el futuro).

---

## 11. Oportunidades de Mejora

### O1 — Download Panel como elemento fijo independiente del scroll [Alto impacto]

Separar el Download Panel del flujo del content area. Posición: `position: fixed`, anclado entre el área de contenido y el Player Bar, ocupando el full-width (sidebar a derecha). El content area ignora su existencia en el layout. Esto elimina los Riesgos 1 y 3 de un golpe.

El panel en estado colapsado muestra una sola línea:
```
↓ 2 active · 68% avg  [∨ expand]
```
En estado expandido, crece hacia arriba (no hacia abajo) sin mover el contenido.

### O2 — Quality selector inline antes de confirmar descarga [Alto impacto]

En los dos puntos de inicio de descarga (overlay hover del card y botón Download de la preview URL), añadir un micro-selector de calidad:

```
↓ Download    [MASTER ∨]
```

El `[MASTER ∨]` es un select compacto que muestra la calidad actual (del Setting) con opción de cambiarla para esta descarga específica. El override es por-descarga, no modifica el Setting global. Resuelve el Riesgo 6 completamente.

### O3 — Barra de progreso compuesta para mayor feedback en tiempo real [Impacto medio]

Reemplazar la barra de progreso simple de "porcentaje de álbum completado" por una barra compuesta:

```
[████████████████░░░░░░░░░░░░░░░░░░] 4/10 tracks
                ↑
           └── fill interno (track actual, progreso within that track)
```

La barra muestra: segmentos sólidos para tracks completados, segmento parcial animado para el track en descarga, segmentos vacíos para tracks pendientes. El usuario ve exactamente cuánto queda de cada track, no solo el porcentaje global.

### O4 — Keyboard navigation para el grid de resultados [Impacto medio]

El Design System define atajos de teclado para el player pero no para la navegación del grid. Para el público técnico de Music 4 All, definir:

| Tecla | Acción |
|---|---|
| `Tab` | Siguiente card en el grid |
| `Shift+Tab` | Card anterior |
| `J` / `K` | Card abajo/arriba |
| `H` / `L` | Card izquierda/derecha |
| `Enter` | Abrir detail panel |
| `D` | Descargar card seleccionada |
| `Escape` | Cerrar detail panel / deseleccionar |

Estas teclas deben añadirse al Design System sección 5.2.

### O5 — Recovery visual post-recarga de página con jobs activos [Impacto medio]

Si el usuario recarga la página con jobs activos en el backend, el Frontend Architecture define que el `downloads.store.ts` se reconstruye desde el backend. Pero no existe un wireframe del estado de "reconnecting to active downloads". El panel debería mostrar:

```
○ Reconnecting to downloads...  [skeleton bar]
```

mientras verifica el estado de los jobs, y luego transicionar al estado correcto (activo/completado/error).

### O6 — Estado "Completed" con acción inmediata en el job completado [Impacto medio]

Cuando un job completa, en lugar de auto-dismiss en 3 segundos, mostrar por 10 segundos:

```
✓ OK Computer — Radiohead    [↗ Show in Finder] [✕]
```

El CTA "Show in Finder" (o "Show in Explorer" en Windows) abre el explorador de archivos en la carpeta de descarga. Es la confirmación tangible que el audiófilo necesita. Después de 10s sin acción, hace fade-out. Si el usuario hace clic en ✕, desaparece inmediatamente.

### O7 — Persistencia de búsqueda reciente [Impacto bajo]

Cuando el input de búsqueda está vacío y en foco, mostrar las últimas 3-5 búsquedas en un dropdown de historial local. No requiere backend: solo localStorage. Acelera el flujo de búsqueda repetida (ej. el usuario que siempre busca al mismo artista para nuevos lanzamientos).

### O8 — Estado de cero resultados diseñado explícitamente [Impacto bajo]

El wireframe no diseña el caso cuando la búsqueda de texto devuelve 0 resultados. Brand Identity sección 9 define la ilustración de "osciloscopio plano (señal en cero)" para este estado, pero el wireframe lo omite. Se necesita:

```
[ilustración: osciloscopio flat line]
No results for "Radiohead Amnesiac OKNOTOK 2026"
Try a different search or paste a Tidal URL directly
```

Con el texto de query entre comillas para que el usuario vea exactamente qué buscó. Las sugerencias de acción son específicas (diferente búsqueda O URL directa), no genéricas.

---

## 12. Funcionalidades Futuras que el Diseño Debe Anticipar

### F1 — Cola con reordenación manual (drag-to-sort)

El Download Panel en su forma actual (lista vertical de jobs) es compatible con drag-and-drop si se añaden drag handles (≡ icono) a la izquierda de cada job. El espacio ya existe en el layout de cada job item. **El diseño actual puede acomodar esto sin cambios de layout.**

### F2 — Soporte multi-servicio en URL detection

El label "URL detected — Album" debería diseñarse con espacio para un identificador de servicio. La versión anticipada sería:

```
[TIDAL icon]  URL detected — Album        vs.
[Qobuz icon]  URL detected — Album
```

Un icono de 16px a la izquierda del label no requiere cambiar nada más. **El espacio está disponible si se reserva ahora.**

### F3 — Player Queue como panel expandible

El Player Bar actualmente no tiene acceso a la queue. En v2, hacer clic en el área de track info del player debería expandir un mini-panel de queue que aparece **sobre** el player bar (hacia arriba), similar al "Up Next" de Spotify. Este panel usaría la misma lógica que el Download Panel pero en el extremo opuesto. El diseño del Download Panel como fixed element (Oportunidad O1) libera el espacio necesario para este expansion pattern.

### F4 — Descarga programada (scheduling)

El menú contextual de la card (⋯) actualmente tiene: "Download Album", "Download Tracks individually", "View on Tidal ↗", "Copy URL". Un quinto item "Download later..." que abre un datepicker sería aditivo sin romper el layout del popover. **El diseño del popover puede absorber un ítem más.**

### F5 — Selección múltiple en el grid para batch download

Cuando el usuario entra en "selection mode" (via `Shift+clic` en cualquier card), las cards deberían mostrar un checkbox en la esquina superior izquierda del artwork. El toolbar encima del grid mutaría a "3 albums selected · [↓ Download all] [✕ Cancel]". Este patrón de selección múltiple **requiere rediseñar el area encima del grid** (donde están las tabs y el toggle grid/list). Anticiparlo ahora evita un rediseño mayor después.

### F6 — Metadata editing post-descarga

La section de metadatos extendidos del Detail Panel (UPC, ISRC, Label) debería tener affordances de edición para el Coleccionista avanzado. Un ícono de edición ✎ al lado del header "METADATA" que activa modo edición inline es suficiente. No requiere una nueva pantalla. **Reservar el espacio para ese ícono ahora.**

### F7 — Notificaciones del sistema operativo

Cuando el usuario tiene otra ventana activa y una descarga completa, el OS debería enviar una notificación nativa. Esto no afecta el wireframe del Dashboard directamente, pero el **toast system actual no es el lugar correcto para este feedback** si el usuario no está mirando la app. El sistema de toasts es para feedback en-app; las notificaciones del OS son para feedback fuera-de-app. La arquitectura de notifications necesita un canal separado que el wireframe actual no contempla.

---

## 13. Veredito y Prioridad de Cambios

### Distribución de hallazgos

| Severidad | Cantidad | Ejemplos |
|---|---|---|
| CRÍTICO | 5 | Contradicción player height, layout shift, loading state faltante, z-index indefinido, inconsistencia B vs D |
| MAYOR | 11 | Badge longitud, calidad opaca, glow violación, Popover faltante, card click ambigüedad |
| MENOR | 7 | Lista view faltante, cero resultados, dot vs badge redundancia |
| OBSERVACIÓN | 4 | Multi-servicio, sidebar colapso, multi-cuenta, notificaciones OS |

### Acciones requeridas antes de implementar

**En `docs/design-system.md`:**
1. Corregir la contradicción player-h: `space-12` no es "Altura de barra de player" — cambiar la descripción al valor semántico correcto.
2. Añadir `⌘K` a la tabla de keyboard shortcuts (sección 5.2).
3. Añadir el componente **Popover** a la sección 3 (entre Tooltip y Tabs).
4. Añadir un z-index intermedio para el Download Panel o clarificar su relación con el Player Bar.
5. Formalizar la regla de panel que toca bordes laterales (¿radius-none justificado o radius-md con borde explícito?).

**En `docs/wireframes-dashboard.md`:**
1. Añadir Estado "B-loading": URL detectada + API fetching metadata (skeleton completo del card, no solo del artwork).
2. Añadir Estado "G-recovery": flujo completo del modal "Check Session" / Device Auth reflow.
3. Rediseñar el Download Panel como fixed element (Oportunidad O1) para eliminar Riesgos 1 y 3.
4. Resolver la inconsistencia B vs D: alinear el comportamiento de selección de tracks individuales en ambos estados.
5. Añadir wireframe de modo Lista (⌕≡) como complemento al modo Grid.
6. Añadir Estado C-zero: cero resultados para búsqueda de texto.
7. Definir la regla de resolución de conflicto de glow (3+ elementos simultáneos).

### Impacto de no resolver los críticos

Si se implementa el diseño actual sin resolver los 5 problemas críticos:

1. La app tendrá un bug visible de layout shift en el primer uso (Riesgo 1).
2. La altura del player bar será inconsistente entre implementadores (contradicción tokens).
3. Los usuarios que descarguen y el player esté activo verán 3 glows, generando el efecto visual incorrecto.
4. El flujo de error del 403 quedará sin pantalla de resolución — un dead-end para el usuario.
5. La descarga individual de tracks desde URL preview (Estado B) vs desde detail panel (Estado D) generará comportamiento inesperado.

### Calificación global del diseño

| Criterio | Calificación | Notas |
|---|---|---|
| Claridad visual | 7/10 | El empty state y la URL preview son excelentes. El panel de descargas inline es problemático. |
| Jerarquía de información | 6/10 | El player bar height ambiguo y el panel de descarga que comprime el grid bajan la nota. |
| Flujo de descarga | 6/10 | URL flow muy bueno. Estado de error incompleto, inconsistencia B vs D, loading state faltante. |
| Escalabilidad futura | 7/10 | El drawer de detalle escala bien. El player bar y el download panel tienen limitaciones claras. |
| Consistencia con Brand Identity | 7/10 | Badge MQA viola límite de chars, glow simultáneo violado, superficie de job items sin definir. |
| Consistencia con Design System | 5/10 | Contradicción crítica de player height, Popover faltante, z-index sin definir, radio inconsistente. |
| Consistencia con Architecture | 7/10 | Download panel mounting point indefinido, Drawer faltante como componente, player store types incompletos. |

**Calificación total: 6.4/10 — Buena base, requiere iteración antes de implementar.**

El diseño tiene decisiones de UX sólidas y correctas (input único para URL/texto, URL preview con track list, panel lateral de detalle sin perder contexto de búsqueda). Los problemas críticos son mayormente de especificación y consistencia interna entre documentos, no de dirección de diseño equivocada. Con los cambios identificados, el diseño puede alcanzar 8.5/10 sin cambios de dirección.

---

*Music 4 All — Dashboard Design Review v1.0 · Junio 2026*  
*Esta revisión debe ser procesada antes de iniciar la implementación del Dashboard.*  
*Siguiente acción: actualizar `docs/design-system.md` con las 5 correcciones identificadas, luego iterar `docs/wireframes-dashboard.md` con los 7 cambios requeridos.*
