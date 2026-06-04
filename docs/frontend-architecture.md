# Music 4 All — Frontend Architecture

> Versión 1.0 · Junio 2026  
> Stack: Next.js 14 App Router · TypeScript · Zustand · TanStack Query  
> Derivado de: `docs/design-system.md` · `docs/brand-identity.md`

---

## Índice

1. [Diagnóstico del estado actual](#1-diagnóstico-del-estado-actual)
2. [Principios arquitectónicos](#2-principios-arquitectónicos)
3. [Adaptación de Feature-Sliced Design a Next.js](#3-adaptación-de-feature-sliced-design-a-nextjs)
4. [Estructura de carpetas](#4-estructura-de-carpetas)
5. [Capas y responsabilidades](#5-capas-y-responsabilidades)
6. [Convenciones de nombres](#6-convenciones-de-nombres)
7. [Manejo de estado](#7-manejo-de-estado)
8. [Manejo de API y capas de datos](#8-manejo-de-api-y-capas-de-datos)
9. [Routing y protección de rutas](#9-routing-y-protección-de-rutas)
10. [WebSocket: integración con el estado global](#10-websocket-integración-con-el-estado-global)
11. [Reglas de importación](#11-reglas-de-importación)
12. [Matriz de dependencias entre capas](#12-matriz-de-dependencias-entre-capas)

---

## 1. Diagnóstico del Estado Actual

El código existente en `frontend/src/` cumple su función, pero muestra señales tempranas de deuda técnica que escalarán mal a medida que crezcan las features.

### Problemas Identificados

| Archivo / área | Problema | Consecuencia |
|---|---|---|
| `src/lib/api.ts` | Todas las llamadas HTTP de todos los dominios en un archivo | Acoplamiento total; un cambio de contrato rompe todo |
| `src/store/useAppStore.ts` | Auth + Downloads en el mismo store | Imposible dividir responsabilidades o tree-shake |
| `src/app/dashboard/page.tsx` | Lógica de auth check, búsqueda, download, WebSocket y UI en un solo componente | God component; no testeable, no reutilizable |
| `src/components/` | Sin estructura de dominio | `NeonTitle`, `ProgressBar`, `VinylCard` al mismo nivel |
| `ws://localhost:8000` | URL de WebSocket hardcodeada en el componente | No funciona en producción, ni con proxy de Next.js |
| Auth check en `useEffect` | Sin middleware de ruta | Race condition entre render y redirección |
| Sin tipos de dominio separados | Types en `api.ts` | Acoplamiento entre transporte y dominio |

### Lo que sí Funciona y se Preserva

- La separación de `QueryProvider` como provider explícito
- El patrón de `create()` de Zustand para stores
- El uso de `useQuery` con `queryKey` semántico
- El hook `useWebSocket` como abstracción de bajo nivel

La nueva arquitectura extiende estas bases, no las descarta.

---

## 2. Principios Arquitectónicos

### P1 — Unidireccionalidad estricta de dependencias

Las capas superiores importan de las inferiores. Nunca al revés. Esto hace que los cambios tengan un impacto predecible y acotado.

```
app → widgets → features → entities → shared
```

### P2 — Separación Server / Client por defecto

En Next.js App Router, los componentes son Server Components por defecto. Los componentes que necesitan estado del cliente (`useState`, `useEffect`, stores) son marcados explícitamente con `'use client'`. El objetivo es minimizar el bundle del cliente.

**Regla:** Si un componente no tiene interactividad, es un Server Component. No agregar `'use client'` preventivamente.

### P3 — Estado del servidor es de TanStack Query. Estado del cliente es de Zustand

No usar Zustand para datos que vienen del backend (listas, metadatos, historial). No usar TanStack Query para estado efímero de UI (qué tab está abierta, si un modal está visible).

| Tipo de estado | Herramienta | Ejemplo |
|---|---|---|
| Datos del servidor | TanStack Query | Lista de álbumes, historial |
| Estado de sesión | Zustand (persistido) | `isAuthenticated` |
| Cola de descargas activas | Zustand | `activeDownloads[]` |
| Estado de UI local | `useState` / `useReducer` | Input value, panel abierto |
| Estado de UI global | Zustand | Tema, sidepanel abierto |

### P4 — La feature es la unidad de trabajo

Una feature encapsula todo lo necesario para una capacidad del producto: tipos, llamadas API, estado, componentes de UI específicos. Añadir una feature nueva no debería requerir tocar otras features.

### P5 — No importar desde `app/` fuera de `app/`

El directorio `app/` de Next.js es exclusivamente para routing y layouts. No exporta nada que no sea un layout, page, loading, o error boundary.

---

## 3. Adaptación de Feature-Sliced Design a Next.js

FSD define estas capas (de más general a más específica):

```
app → pages → widgets → features → entities → shared
```

En Next.js App Router, la capa `pages` del FSD clásico no existe: el router maneja las rutas dentro de `app/`. La adaptación es:

```
src/app/        ← Next.js routing (layouts, pages, middleware)
src/widgets/    ← Bloques de UI compuestos (player, sidebar, panels)
src/features/   ← Lógica de negocio por dominio (auth, library, downloads...)
src/entities/   ← Modelos de dominio puros (Album, Track, DownloadJob...)
src/shared/     ← Infraestructura compartida (UI kit, http client, hooks genéricos)
```

### La Capa `app/` como Orchestrator

Los archivos en `app/` son el punto de entrada de cada ruta. Son delgados: solo componen widgets y pasan props. La lógica de negocio vive en `features/`.

```
app/
  (app)/
    library/
      page.tsx    ← Importa <LibraryView /> de widgets/library y nada más
```

### Route Groups para Separar Layouts

Next.js Route Groups (`(name)/`) permiten aplicar layouts sin afectar la URL. Se usan dos grupos principales:

- `(auth)/` → Layout sin sidebar, sin player. Para login.
- `(app)/` → Layout completo autenticado: sidebar + player bar + contenido.

---

## 4. Estructura de Carpetas

```
frontend/
└── src/
    │
    ├── app/                              ← Next.js App Router
    │   ├── layout.tsx                    ← Root layout: providers globales
    │   ├── globals.css                   ← CSS global + variables de tokens
    │   ├── middleware.ts                 ← Protección de rutas
    │   │
    │   ├── (auth)/                       ← Route group: páginas sin autenticar
    │   │   └── login/
    │   │       ├── page.tsx
    │   │       └── loading.tsx
    │   │
    │   └── (app)/                        ← Route group: páginas autenticadas
    │       ├── layout.tsx                ← Layout con Sidebar + PlayerBar
    │       │
    │       ├── dashboard/
    │       │   ├── page.tsx
    │       │   └── loading.tsx
    │       │
    │       ├── library/
    │       │   ├── page.tsx
    │       │   ├── loading.tsx
    │       │   └── [id]/
    │       │       ├── page.tsx          ← Album / Playlist detail
    │       │       └── loading.tsx
    │       │
    │       ├── downloads/
    │       │   ├── page.tsx
    │       │   └── loading.tsx
    │       │
    │       ├── history/
    │       │   ├── page.tsx
    │       │   └── loading.tsx
    │       │
    │       └── settings/
    │           ├── page.tsx
    │           └── loading.tsx
    │
    ├── widgets/                          ← Bloques de UI compuestos
    │   ├── sidebar/
    │   │   ├── index.ts                  ← Public API del widget
    │   │   ├── Sidebar.tsx
    │   │   ├── NavItem.tsx
    │   │   └── ConnectionStatus.tsx
    │   │
    │   ├── player-bar/
    │   │   ├── index.ts
    │   │   ├── PlayerBar.tsx
    │   │   ├── PlaybackControls.tsx
    │   │   ├── ProgressSlider.tsx
    │   │   ├── VolumeControl.tsx
    │   │   └── model/
    │   │       └── player.store.ts       ← Estado del player (Zustand)
    │   │
    │   ├── download-panel/
    │   │   ├── index.ts
    │   │   ├── DownloadPanel.tsx
    │   │   ├── DownloadItem.tsx
    │   │   └── QueueList.tsx
    │   │
    │   └── search-bar/
    │       ├── index.ts
    │       ├── SearchBar.tsx
    │       └── SearchResultList.tsx
    │
    ├── features/                         ← Features de la aplicación
    │   │
    │   ├── auth/
    │   │   ├── index.ts                  ← Public API de la feature
    │   │   ├── model/
    │   │   │   ├── auth.store.ts         ← Zustand store de autenticación
    │   │   │   └── auth.queries.ts       ← TanStack Query hooks
    │   │   ├── api/
    │   │   │   └── auth.api.ts           ← Llamadas HTTP de autenticación
    │   │   └── ui/
    │   │       ├── LoginForm.tsx
    │   │       ├── DeviceAuthFlow.tsx
    │   │       └── LogoutButton.tsx
    │   │
    │   ├── library/
    │   │   ├── index.ts
    │   │   ├── model/
    │   │   │   ├── library.store.ts      ← Filtros, view mode (grid/list)
    │   │   │   └── library.queries.ts    ← search, album detail, tracks
    │   │   ├── api/
    │   │   │   └── library.api.ts
    │   │   └── ui/
    │   │       ├── AlbumGrid.tsx
    │   │       ├── AlbumList.tsx
    │   │       ├── AlbumCard.tsx
    │   │       ├── TrackList.tsx
    │   │       ├── TrackRow.tsx
    │   │       ├── AlbumHero.tsx
    │   │       └── EmptyLibrary.tsx
    │   │
    │   ├── downloads/
    │   │   ├── index.ts
    │   │   ├── model/
    │   │   │   ├── downloads.store.ts    ← Cola de descargas activas
    │   │   │   └── downloads.queries.ts  ← Polling de estado de jobs
    │   │   ├── api/
    │   │   │   └── downloads.api.ts
    │   │   ├── hooks/
    │   │   │   └── useDownloadSocket.ts  ← WS conectado al store
    │   │   └── ui/
    │   │       ├── DownloadButton.tsx
    │   │       ├── DownloadQueue.tsx
    │   │       └── DownloadStatusBadge.tsx
    │   │
    │   ├── history/
    │   │   ├── index.ts
    │   │   ├── model/
    │   │   │   └── history.queries.ts
    │   │   ├── api/
    │   │   │   └── history.api.ts
    │   │   └── ui/
    │   │       ├── HistoryTable.tsx
    │   │       ├── HistoryRow.tsx
    │   │       └── EmptyHistory.tsx
    │   │
    │   └── settings/
    │       ├── index.ts
    │       ├── model/
    │       │   └── settings.store.ts     ← Configuración persistida
    │       ├── api/
    │       │   └── settings.api.ts
    │       └── ui/
    │           ├── QualitySelector.tsx
    │           ├── DownloadPathInput.tsx
    │           └── ConnectionSettings.tsx
    │
    ├── entities/                         ← Modelos de dominio
    │   ├── album/
    │   │   ├── index.ts
    │   │   ├── album.types.ts
    │   │   └── album.utils.ts
    │   │
    │   ├── track/
    │   │   ├── index.ts
    │   │   ├── track.types.ts
    │   │   └── track.utils.ts
    │   │
    │   ├── playlist/
    │   │   ├── index.ts
    │   │   └── playlist.types.ts
    │   │
    │   ├── download-job/
    │   │   ├── index.ts
    │   │   ├── download-job.types.ts
    │   │   └── download-job.utils.ts
    │   │
    │   └── session/
    │       ├── index.ts
    │       └── session.types.ts
    │
    └── shared/                           ← Infraestructura compartida
        ├── api/
        │   ├── client.ts                 ← Axios instance configurada
        │   ├── ws-client.ts              ← WebSocket base abstraction
        │   └── query-client.ts           ← TanStack QueryClient + defaults
        │
        ├── ui/                           ← Design System components
        │   ├── Button/
        │   │   ├── Button.tsx
        │   │   └── index.ts
        │   ├── Input/
        │   │   ├── Input.tsx
        │   │   └── index.ts
        │   ├── Card/
        │   │   ├── Card.tsx
        │   │   └── index.ts
        │   ├── Modal/
        │   │   ├── Modal.tsx
        │   │   └── index.ts
        │   ├── Toast/
        │   │   ├── Toast.tsx
        │   │   ├── ToastProvider.tsx
        │   │   └── index.ts
        │   ├── Badge/
        │   │   ├── Badge.tsx
        │   │   └── index.ts
        │   ├── ProgressBar/
        │   │   ├── ProgressBar.tsx
        │   │   └── index.ts
        │   ├── Tooltip/
        │   │   ├── Tooltip.tsx
        │   │   └── index.ts
        │   ├── Tabs/
        │   │   ├── Tabs.tsx
        │   │   └── index.ts
        │   └── index.ts                  ← Re-exporta todo el UI kit
        │
        ├── hooks/
        │   ├── useDebounce.ts
        │   ├── useLocalStorage.ts
        │   └── useWebSocket.ts           ← Migrado desde src/hooks/
        │
        ├── config/
        │   ├── api.config.ts             ← Base URL, timeouts
        │   └── ws.config.ts              ← WS URL builder
        │
        ├── lib/
        │   ├── cn.ts                     ← clsx + tailwind-merge helper
        │   ├── format.ts                 ← Formatters (duration, filesize, bitrate)
        │   └── errors.ts                 ← Error types y handlers
        │
        └── types/
            ├── api.types.ts              ← Tipos de respuestas HTTP genéricas
            └── common.types.ts           ← Tipos utilitarios (Nullable, Maybe, etc.)
```

---

## 5. Capas y Responsabilidades

### 5.1 `app/` — Routing y Orquestación

**Responsabilidad única:** definir qué se muestra en cada ruta y bajo qué layout.

Los archivos en `app/` son siempre Server Components salvo cuando necesiten providers del lado del cliente. Cada `page.tsx` hace lo mínimo:

```
page.tsx → importa un <FeatureView /> de widgets/
         → pasa parámetros de ruta (searchParams, params)
         → no contiene lógica de negocio
```

Archivos especiales que vive en `app/` y en ningún otro lado:
- `layout.tsx` — layouts de ruta
- `loading.tsx` — Suspense boundaries automáticos
- `error.tsx` — Error boundaries por ruta
- `not-found.tsx` — Páginas 404
- `middleware.ts` — Edge middleware de protección

### 5.2 `widgets/` — Bloques Compostos de UI

**Responsabilidad:** Componer features y entities en bloques de UI que aparecen en múltiples páginas o que son demasiado grandes para vivir en una feature.

Los widgets saben del dominio. Pueden importar de `features/` y de `entities/`. No pueden importar de `app/`.

**Cuándo crear un widget vs un componente de feature:**
- Si aparece en múltiples páginas → widget
- Si solo aparece dentro de una feature → componente de feature
- Si es genérico y reutilizable sin dominio → `shared/ui`

| Widget | Aparece en |
|---|---|
| `Sidebar` | Todas las páginas del grupo `(app)` |
| `PlayerBar` | Todas las páginas del grupo `(app)` |
| `DownloadPanel` | Dashboard, Downloads |
| `SearchBar` | Dashboard, Library |

### 5.3 `features/` — Lógica de Negocio por Dominio

**Responsabilidad:** Encapsular todo lo relacionado con una capacidad del producto. Cada feature tiene su propia subcarpeta con estructura fija:

```
features/{nombre}/
  index.ts          ← Solo exporta la Public API de la feature
  model/            ← Estado (Zustand stores) y queries (TanStack)
  api/              ← Llamadas HTTP específicas del dominio
  ui/               ← Componentes React específicos del dominio
  hooks/            ← Hooks específicos del dominio (opcional)
```

**Regla de Public API:** El `index.ts` de cada feature define exactamente qué se puede importar desde afuera. Todo lo que no está en `index.ts` es privado de la feature. Esto evita acoplamientos accidentales.

Las features **no** pueden importar de otras features directamente. Si dos features necesitan algo en común, ese algo sube a `entities/` o `shared/`.

### 5.4 `entities/` — Modelos de Dominio Puros

**Responsabilidad:** Definir los tipos de datos del dominio y las operaciones puras sobre ellos. No contienen UI ni efectos secundarios.

```
entities/album/
  album.types.ts    ← interface Album, AlbumDetail, AlbumSummary
  album.utils.ts    ← formatAlbumDuration(), getAlbumQualityLabel()
  index.ts
```

Los entities son los contratos entre el backend y el frontend. Cuando la API cambia, se actualiza el entity y las features se adaptan.

**Distinción entre entity type y API response type:**

```
// entities/album/album.types.ts  ← dominio interno
interface Album {
  id: string
  title: string
  artist: string
  releaseYear: number
  tracks: Track[]
  quality: AudioQuality
}

// shared/types/api.types.ts ← contrato con el backend (snake_case de FastAPI)
interface AlbumApiResponse {
  id: string
  title: string
  artist: string
  release_year: number
  tracks: TrackApiResponse[]
  audio_quality: string
}
```

El entity tiene su propia forma (camelCase, tipos enriquecidos). El mapper vive en `features/{feature}/api/*.api.ts`.

### 5.5 `shared/` — Infraestructura y Utilidades

**Responsabilidad:** Todo lo que no tiene conocimiento del dominio y puede ser usado desde cualquier capa.

Subcarpetas y su propósito:

| Subcarpeta | Contenido | Puede contener 'use client'? |
|---|---|---|
| `shared/api/` | HTTP client, WS client, QueryClient | No — es infraestructura |
| `shared/ui/` | Componentes del Design System | Sí — son componentes interactivos |
| `shared/hooks/` | Hooks genéricos (debounce, storage) | Sí — hooks de cliente |
| `shared/config/` | Variables de configuración | No |
| `shared/lib/` | Funciones utilitarias puras | No |
| `shared/types/` | Tipos TypeScript transversales | No |

---

## 6. Convenciones de Nombres

### Archivos y Carpetas

| Tipo | Convención | Ejemplo |
|---|---|---|
| Componente React | PascalCase | `AlbumCard.tsx` |
| Hook | camelCase con prefijo `use` | `useDownloadSocket.ts` |
| Store Zustand | camelCase con sufijo `.store` | `downloads.store.ts` |
| Queries TanStack | camelCase con sufijo `.queries` | `library.queries.ts` |
| API functions | camelCase con sufijo `.api` | `library.api.ts` |
| Types | camelCase con sufijo `.types` | `album.types.ts` |
| Utils | camelCase con sufijo `.utils` | `album.utils.ts` |
| Config | camelCase con sufijo `.config` | `api.config.ts` |
| Índice de public API | siempre `index.ts` | `index.ts` |
| Carpeta de feature | kebab-case | `download-job/` |
| Carpeta de widget | kebab-case | `player-bar/` |
| Página Next.js | siempre `page.tsx` | `page.tsx` |
| Layout Next.js | siempre `layout.tsx` | `layout.tsx` |

### Interfaces y Types TypeScript

| Tipo | Convención | Ejemplo |
|---|---|---|
| Interface de dominio | PascalCase, sin prefijo I | `interface Album {}` |
| Type alias | PascalCase | `type AudioQuality = 'hifi' \| 'master'` |
| Props de componente | `{ComponentName}Props` | `interface AlbumCardProps {}` |
| Respuesta de API | `{Entity}ApiResponse` | `interface AlbumApiResponse {}` |
| Payload de Zustand action | `{Entity}Patch` | `interface DownloadJobPatch {}` |
| Estado de Zustand | `{Feature}State` | `interface DownloadsState {}` |

### Funciones y Variables

| Tipo | Convención | Ejemplo |
|---|---|---|
| Componente React | PascalCase | `function AlbumCard()` |
| Función de API | verbo + entidad | `fetchAlbum()`, `startDownload()` |
| Selector de store | `select` + descripción | `selectActiveDownloads()` |
| Query key factory | `{entity}Keys` | `albumKeys.detail(id)` |
| Evento handler | `handle` + acción | `handleDownload()`, `handleSearch()` |
| Mapper API→dominio | `map` + origen + destino | `mapApiResponseToAlbum()` |

### Exports de Componentes

Los componentes siempre se exportan con `export function`, no como `export default` dentro de `features/` y `widgets/`. Los `default export` quedan reservados para archivos en `app/` (que Next.js requiere).

```typescript
// ✓ Correcto — en features/ y widgets/
export function AlbumCard({ album }: AlbumCardProps) { ... }

// ✓ Correcto — en app/ (requerido por Next.js)
export default function LibraryPage() { ... }

// ✗ Incorrecto — en features/
export default function AlbumCard() { ... }
```

### Query Keys

Usar el patrón de **Query Key Factories** para evitar strings mágicos:

```typescript
// entities/album/album.query-keys.ts
export const albumKeys = {
  all: ['albums'] as const,
  lists: () => [...albumKeys.all, 'list'] as const,
  detail: (id: string) => [...albumKeys.all, 'detail', id] as const,
  tracks: (id: string) => [...albumKeys.all, 'tracks', id] as const,
}

// entities/track/track.query-keys.ts
export const trackKeys = {
  all: ['tracks'] as const,
  search: (query: string) => [...trackKeys.all, 'search', query] as const,
}
```

---

## 7. Manejo de Estado

### 7.1 División de Responsabilidades

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESTADO DE LA APLICACIÓN                      │
├──────────────────────────┬──────────────────────────────────────┤
│   TANSTACK QUERY         │   ZUSTAND                           │
│   (Estado del servidor)  │   (Estado del cliente)              │
│                          │                                     │
│  • Resultados de búsqueda│  • Sesión autenticada               │
│  • Metadatos de álbumes  │  • Cola de descargas activas        │
│  • Historial de descargas│  • Configuración de la app          │
│  • Estado de jobs (poll) │  • Estado del player (pista actual) │
│  • Detalles de tracks    │  • Preferencias de vista (grid/list)│
└──────────────────────────┴──────────────────────────────────────┘
                                      │
                    ┌─────────────────┴──────────────────┐
                    │   useState / useReducer             │
                    │   (Estado local del componente)     │
                    │                                     │
                    │  • Input values                     │
                    │  • Tab activa                       │
                    │  • Modal abierto/cerrado            │
                    │  • Elemento seleccionado en lista   │
                    └─────────────────────────────────────┘
```

### 7.2 Stores de Zustand

Cada feature tiene su propio store. Los stores no se importan entre sí — si dos features necesitan el mismo estado, ese estado sube a un store de widget o se pasa por props.

#### `features/auth/model/auth.store.ts`

Responsabilidad: Estado de la sesión de Tidal.

```
Estado:
  isAuthenticated: boolean
  pendingDeviceAuth: DeviceAuthData | null

Acciones:
  setAuthenticated(value: boolean)
  setPendingDeviceAuth(data: DeviceAuthData | null)
  clearSession()
```

Este store es la única fuente de verdad del estado de autenticación. No se inicializa directamente: se hidrata desde la respuesta del servidor en el layout protegido.

#### `features/downloads/model/downloads.store.ts`

Responsabilidad: Queue de descargas activas en memoria. No persiste entre recargas (los jobs activos se recuperan del backend si la página recarga).

```
Estado:
  queue: DownloadJob[]

Acciones:
  enqueue(job: DownloadJob)
  updateJob(jobId: string, patch: Partial<DownloadJob>)
  removeJob(jobId: string)
  clearCompleted()

Selectores derivados (sin estado propio):
  selectActiveJobs()     → queue donde status es 'pending' | 'downloading'
  selectCompletedJobs()  → queue donde status es 'completed'
  selectFailedJobs()     → queue donde status es 'failed'
```

Este store es la contraparte de cliente del WebSocket. Los mensajes WS actualizan el store, los componentes reaccionan.

#### `features/settings/model/settings.store.ts`

Responsabilidad: Preferencias del usuario que persisten en localStorage.

```
Estado:
  audioQuality: 'hifi' | 'master' | 'high' | 'low'
  downloadPath: string
  concurrentDownloads: number
  viewMode: 'grid' | 'list'

Persistencia: zustand/middleware/persist con localStorage
```

#### `widgets/player-bar/model/player.store.ts`

Responsabilidad: Estado del reproductor de audio.

```
Estado:
  currentTrack: Track | null
  isPlaying: boolean
  progress: number       ← 0–1
  volume: number         ← 0–1
  queue: Track[]
  queueIndex: number

Acciones:
  setTrack(track: Track)
  play()
  pause()
  seek(progress: number)
  setVolume(volume: number)
  nextTrack()
  prevTrack()
  addToQueue(track: Track)
```

### 7.3 Zustand: Patrones que Se Siguen

**Slices separados, nunca un megastore:**
```typescript
// ✓ Correcto
export const useAuthStore = create<AuthState>(...)
export const useDownloadsStore = create<DownloadsState>(...)

// ✗ Incorrecto
export const useAppStore = create<AuthState & DownloadsState & PlayerState>(...)
```

**Selectores explícitos para performance:**
```typescript
// ✓ Correcto — solo re-renderiza cuando isAuthenticated cambia
const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

// ✗ Incorrecto — re-renderiza con cualquier cambio del store
const { isAuthenticated, clearSession } = useAuthStore()
```

**Acciones fuera del store (sin efectos secundarios en el store):**
```typescript
// El store solo maneja estado puro.
// Las acciones que llaman API viven en hooks o en event handlers:

// ✓ Correcto
async function handleLogout() {
  await authApi.logout()           // llamada HTTP en features/auth/api/
  useAuthStore.getState().clearSession() // mutación de estado
}

// ✗ Incorrecto — efectos en el store
logout: async () => {
  await apiLogout()                // efecto secundario dentro del store
  set({ isAuthenticated: false })
}
```

### 7.4 TanStack Query: Configuración Global

El `QueryClient` con defaults globales vive en `shared/api/query-client.ts`:

```
defaultOptions:
  queries:
    staleTime:            5 * 60 * 1000   ← 5 minutos (metadatos no cambian frecuente)
    gcTime:               10 * 60 * 1000  ← 10 minutos en caché
    retry:                1               ← un reintento antes de error
    refetchOnWindowFocus: false           ← app de escritorio, no SPA web
  mutations:
    retry:                0               ← mutaciones no se reintentan
```

La excepción son las queries de estado de jobs de descarga, que tienen su propio `staleTime: 0` y `refetchInterval` dinámico (mientras el job esté activo).

---

## 8. Manejo de API y Capas de Datos

El flujo de datos del backend al componente pasa por cuatro capas:

```
Backend (FastAPI)
       ↓
HTTP Client (shared/api/client.ts)
       ↓
API function (features/{name}/api/{name}.api.ts)
       ↓
Query hook (features/{name}/model/{name}.queries.ts)
       ↓
Componente React
```

### 8.1 HTTP Client — `shared/api/client.ts`

El cliente Axios central con:
- `baseURL` derivada de `shared/config/api.config.ts` (no hardcodeada)
- Interceptor de request: adjunta headers de sesión si existen
- Interceptor de response: transforma errores HTTP a `AppError` tipados
- Timeout global: 30s

El cliente no sabe nada del dominio. Solo provee transporte.

### 8.2 API Functions — `features/{name}/api/{name}.api.ts`

Cada función de API:
1. Llama al HTTP client
2. Mapea la respuesta de snake_case (FastAPI) a camelCase (dominio interno)
3. Devuelve un tipo de dominio de `entities/`, no la respuesta raw de la API

```
// features/library/api/library.api.ts

async function searchLibrary(query: string, limit: number): Promise<Album[]>
async function fetchAlbumDetail(id: string): Promise<AlbumDetail>
async function fetchAlbumTracks(albumId: string): Promise<Track[]>
async function fetchPlaylistDetail(id: string): Promise<PlaylistDetail>
```

El mapper de respuesta API → dominio es una función pura en el mismo archivo, prefijada con `map`:

```
function mapApiAlbumToAlbum(raw: AlbumApiResponse): Album { ... }
```

### 8.3 Query Hooks — `features/{name}/model/{name}.queries.ts`

Encapsulan TanStack Query. Los componentes nunca llaman a `useQuery` directamente con configuración: usan estos hooks.

```
// features/library/model/library.queries.ts

function useSearchQuery(query: string): UseQueryResult<Album[]>
function useAlbumDetailQuery(id: string): UseQueryResult<AlbumDetail>
function useAlbumTracksQuery(albumId: string): UseQueryResult<Track[]>

// features/downloads/model/downloads.queries.ts
function useDownloadJobQuery(jobId: string): UseQueryResult<DownloadJob>

// features/history/model/history.queries.ts
function useHistoryQuery(): UseQueryResult<DownloadRecord[]>

// features/auth/model/auth.queries.ts
function useAuthStatusQuery(): UseQueryResult<AuthStatus>
```

### 8.4 Mutations

Las mutations también se encapsulan en hooks de query:

```
// features/auth/model/auth.queries.ts
function useStartDeviceAuthMutation(): UseMutationResult<DeviceAuthData>
function useLogoutMutation(): UseMutationResult<void>

// features/downloads/model/downloads.queries.ts
function useStartDownloadMutation(): UseMutationResult<DownloadJob, Error, string>
```

Los `onSuccess` de mutations se usan para invalidar queries relacionadas y actualizar stores:

```
onSuccess: (job) => {
  useDownloadsStore.getState().enqueue(job)
  queryClient.invalidateQueries({ queryKey: historyKeys.all })
}
```

### 8.5 Diagrama de Flujo de Datos por Feature

#### Feature: Library / Search

```
Usuario escribe en SearchBar
        ↓
useSearchQuery(debouncedQuery)    ← features/library/model/library.queries.ts
        ↓
searchLibrary(query)              ← features/library/api/library.api.ts
        ↓
GET /api/metadata/search          ← Backend FastAPI
        ↓
mapApiAlbumToAlbum[]              ← mapper en library.api.ts
        ↓
Album[]                           ← tipo de entities/album/
        ↓
<AlbumGrid albums={...} />        ← features/library/ui/AlbumGrid.tsx
```

#### Feature: Downloads + WebSocket

```
Usuario hace click en "Download"
        ↓
useStartDownloadMutation()        ← features/downloads/model/downloads.queries.ts
        ↓
startDownload(url)                ← features/downloads/api/downloads.api.ts
        ↓
POST /api/download/start          ← Backend
        ↓
DownloadJob (jobId, status, ...)  ← tipo de entities/download-job/
        ↓
downloadsStore.enqueue(job)       ← Zustand
        ↓
useDownloadSocket(jobId)          ← features/downloads/hooks/useDownloadSocket.ts
        ↓  ← WebSocket /ws/progress/{jobId}
Mensajes WS { progress, status }
        ↓
downloadsStore.updateJob(...)     ← Zustand
        ↓
<DownloadPanel />                 ← widgets/download-panel/ reacciona al store
```

---

## 9. Routing y Protección de Rutas

### 9.1 Route Groups y Layouts

```
app/
  layout.tsx                ← Root layout: fuentes, QueryProvider, ToastProvider
  (auth)/
    layout.tsx              ← Layout minimal: solo centra el contenido
    login/page.tsx
  (app)/
    layout.tsx              ← Layout autenticado: <Sidebar> + <PlayerBar> + {children}
    dashboard/page.tsx
    library/page.tsx
    library/[id]/page.tsx
    downloads/page.tsx
    history/page.tsx
    settings/page.tsx
```

El `(app)/layout.tsx` es un Server Component que verifica la sesión del lado del servidor antes de renderizar. Si no hay sesión válida, hace `redirect('/login')`.

### 9.2 Middleware de Protección — `app/middleware.ts`

El middleware de Next.js corre en el Edge Runtime antes de que cualquier ruta sea procesada. Es la primera línea de defensa.

**Responsabilidad del middleware:**
- Leer el token de sesión de las cookies
- Si la ruta es protegida y no hay sesión → redirigir a `/login`
- Si la ruta es de auth y ya hay sesión → redirigir a `/dashboard`

**Rutas protegidas** (require sesión):
```
/dashboard
/library
/library/*
/downloads
/history
/settings
```

**Rutas públicas** (no require sesión):
```
/login
/api/*         ← Next.js reescribe al backend; el backend maneja su propia auth
```

El matcher del middleware:
```
matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)']
```

### 9.3 Hydración de la Sesión en el Layout

El `(app)/layout.tsx` actúa como el boundary entre "sabemos que estás autenticado" y el árbol de componentes de la app. Es un Server Component que:

1. Lee el token de sesión (cookie httpOnly)
2. Hace un fetch al backend para validar (`/api/auth/status`)
3. Si inválido: `redirect('/login')`
4. Si válido: renderiza el layout con la sesión disponible

Los stores de Zustand se hidratan en el cliente usando un Client Component provider que recibe los datos iniciales como props del Server Component padre.

### 9.4 Loading States por Ruta

Cada ruta tiene su `loading.tsx` que exporta un skeleton screen específico para ese contenido:

```
library/loading.tsx    → skeleton de AlbumGrid (cards grises en grid)
history/loading.tsx    → skeleton de HistoryTable (filas grises)
downloads/loading.tsx  → skeleton de DownloadQueue
```

---

## 10. WebSocket: Integración con el Estado Global

El WebSocket es uno de los puntos de complejidad de la arquitectura. Se resuelve con tres capas:

### 10.1 Capa 1 — Base WS Client (`shared/api/ws-client.ts`)

Abstracción genérica de bajo nivel sobre la API nativa de WebSocket. No conoce el dominio. Maneja:
- Reconexión automática con backoff exponencial
- Parsing de mensajes JSON
- Tipado genérico del mensaje

### 10.2 Capa 2 — Hook de Dominio (`features/downloads/hooks/useDownloadSocket.ts`)

Usa el base WS client con tipado específico del dominio de descargas:
- Se conecta a `/ws/progress/{jobId}` usando la URL del `shared/config/ws.config.ts`
- Al recibir mensajes, llama a `downloadsStore.updateJob()`
- Gestiona la desconexión cuando el job termina o el componente se desmonta

```
Signatura del hook:
useDownloadSocket(jobId: string | null): void

Comportamiento:
  - Si jobId es null → no conecta
  - Si el job llega a status 'completed' | 'failed' → cierra la conexión
  - Si el componente se desmonta → cierra la conexión
```

### 10.3 Capa 3 — URL de WebSocket (`shared/config/ws.config.ts`)

La URL del WebSocket se construye a partir de la configuración, no está hardcodeada:

```
Lógica de URL:
  En desarrollo:  ws://localhost:8000/ws/progress/{jobId}
  En producción:  wss://{window.location.host}/ws/progress/{jobId}
  (proxy de Next.js redirige /ws/* al backend)
```

El `next.config.mjs` incluye rewrite rules para `/ws/` igual que las tiene para `/api/`.

### 10.4 Múltiples Jobs Simultáneos

El `useDownloadSocket` se instancia una vez por job activo. El `DownloadPanel` monta el hook para cada job en la queue:

```
queue = [jobA, jobB, jobC]
         ↓        ↓        ↓
  useDownloadSocket(A) B  C   ← tres conexiones WS simultáneas
```

El límite práctico de conexiones simultáneas lo define el backend. El frontend puede cap-ear usando el setting `concurrentDownloads` de `settings.store.ts`.

---

## 11. Reglas de Importación

### 11.1 Paths Absolutos con `@/`

Configurado en `tsconfig.json` con `paths`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Todos los imports usan `@/` como raíz. Nunca rutas relativas que suban más de un nivel (`../../`).

```typescript
// ✓ Correcto
import { Album } from '@/entities/album'
import { Button } from '@/shared/ui'
import { useSearchQuery } from '@/features/library/model/library.queries'

// ✗ Incorrecto
import { Album } from '../../../entities/album'
```

### 11.2 Importar Solo Desde Public APIs

Cada capa expone una Public API a través de su `index.ts`. Los consumidores importan del `index.ts`, nunca de los archivos internos directamente.

```typescript
// ✓ Correcto — importa de la public API de la feature
import { AlbumCard, useSearchQuery } from '@/features/library'

// ✗ Incorrecto — accede a un archivo interno
import { AlbumCard } from '@/features/library/ui/AlbumCard'
import { useSearchQuery } from '@/features/library/model/library.queries'
```

**Excepción:** Dentro de la misma feature, los archivos sí pueden importarse entre sí directamente (por subcarpeta), sin pasar por el `index.ts` de la feature.

### 11.3 Regla de Capas (No Importar Hacia Arriba)

| Capa | Puede importar de |
|---|---|
| `app/` | `widgets/`, `features/`, `entities/`, `shared/` |
| `widgets/` | `features/`, `entities/`, `shared/` |
| `features/` | `entities/`, `shared/` |
| `entities/` | `shared/` |
| `shared/` | Nadie (solo librerías externas) |

Las violaciones de esta regla son un error de arquitectura, no de implementación.

### 11.4 No Cross-Feature Imports

```typescript
// ✗ Incorrecto — feature importa de otra feature
// features/library/ui/AlbumCard.tsx
import { useDownloadsStore } from '@/features/downloads'
```

Si `library` necesita saber si un álbum está siendo descargado, `downloads` expone ese dato como un selector que `library` consulta. Pero si esto se vuelve complejo, el estado se mueve a un widget o a `entities/download-job/`.

---

## 12. Matriz de Dependencias entre Capas

Esta tabla es el contrato de importaciones. Si una importación viola esta matriz, debe discutirse antes de agregarse.

```
                  ┌────────┬─────────┬──────────┬──────────┬────────┐
                  │  app   │ widgets │ features │ entities │ shared │
┌─────────────────┼────────┼─────────┼──────────┼──────────┼────────┤
│ app             │   —    │   ✓     │    ✓     │    ✓     │   ✓   │
│ widgets         │   ✗    │   —     │    ✓     │    ✓     │   ✓   │
│ features        │   ✗    │   ✗     │    —*    │    ✓     │   ✓   │
│ entities        │   ✗    │   ✗     │    ✗     │    —     │   ✓   │
│ shared          │   ✗    │   ✗     │    ✗     │    ✗     │   —   │
└─────────────────┴────────┴─────────┴──────────┴──────────┴────────┘

* features entre sí: ✗ — prohibido
```

---

## Apéndice A — Migración desde el Código Actual

Para pasar de la estructura actual a esta arquitectura de forma incremental:

### Fase 1 — Shared layer (sin breaking changes)

1. Crear `shared/api/client.ts` extrayendo el axios instance de `lib/api.ts`
2. Crear `shared/config/api.config.ts` y `shared/config/ws.config.ts`
3. Mover `hooks/useWebSocket.ts` → `shared/hooks/useWebSocket.ts`
4. Crear `shared/lib/cn.ts` (clsx + twMerge helper)

### Fase 2 — Entities (tipos puros)

5. Crear `entities/album/album.types.ts` con los tipos de `SearchResult`
6. Crear `entities/download-job/download-job.types.ts` con `DownloadJob`
7. Crear `entities/session/session.types.ts` con `AuthStatusResponse`

### Fase 3 — Features (por dominio)

8. Crear `features/auth/` extrayendo auth functions de `lib/api.ts` y auth store de `store/useAppStore.ts`
9. Crear `features/library/` extrayendo search functions
10. Crear `features/downloads/` extrayendo download functions + download store
11. Crear `features/history/` extrayendo history function

### Fase 4 — Widgets y App layer

12. Crear `widgets/sidebar/` extrayendo la nav del dashboard
13. Crear `widgets/download-panel/` extrayendo el panel de descargas del dashboard
14. Refactorizar `app/(app)/dashboard/page.tsx` para que solo componga widgets

### Fase 5 — Shared UI

15. Migrar componentes genéricos (`ProgressBar`, `NeonTitle` como `AppLogo`) a `shared/ui/`
16. Migrar `VinylCard` y `DownloadButton` a `features/library/ui/` y `features/downloads/ui/`

---

## Apéndice B — Archivos de Configuración Afectados

Al implementar esta arquitectura, los archivos de configuración del proyecto requieren las siguientes actualizaciones:

| Archivo | Cambio requerido |
|---|---|
| `tsconfig.json` | Añadir `paths: { "@/*": ["./src/*"] }` |
| `next.config.mjs` | Añadir rewrite de `/ws/` al backend, además del `/api/` existente |
| `tailwind.config.ts` | Actualizar `content` glob para incluir todos los subdirectorios nuevos |
| `.eslintrc` | Añadir regla `import/no-cycle` para detectar imports circulares |

---

*Music 4 All Frontend Architecture v1.0 · Junio 2026*  
*Próximo paso: implementar `shared/` y `entities/` siguiendo el Apéndice A — Fase 1.*
