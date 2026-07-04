# Music 4 All — Frontend Implementation Specification v1.0

> Junio 2026  
> Target: Dashboard v2.0 (`docs/wireframes-dashboard-v2.md`)  
> Stack: Next.js 14 App Router · TypeScript · Zustand · TanStack Query v5 · shadcn/ui · Tailwind CSS · Framer Motion  
> Referencia: `docs/frontend-architecture.md` · `docs/design-system.md`

Este documento es la fuente de verdad técnica para implementar el Dashboard. Los diseñadores deben leer los wireframes; los desarrolladores deben leer este documento.

---

## Índice

1. [Component Tree](#1-component-tree)
2. [Props Contracts](#2-props-contracts)
3. [Zustand Stores](#3-zustand-stores)
4. [TanStack Query Layer](#4-tanstack-query-layer)
5. [API Contracts y DTOs](#5-api-contracts-y-dtos)
6. [Event Flow](#6-event-flow)
7. [Accessibility Specification](#7-accessibility-specification)
8. [Responsive Rules](#8-responsive-rules)
9. [Error Handling Matrix](#9-error-handling-matrix)
10. [File Structure](#10-file-structure)
11. [Implementation Priority](#11-implementation-priority)

---

## 1. Component Tree

### Convención

| Sufijo / patrón | Tipo | Tiene lógica | Tiene estado local |
|---|---|---|---|
| `Page` / no sufijo en `app/` | Routing shell | No (delega) | No |
| `Container` / `Panel` (sin sufijo UI) | Container | Sí | A veces |
| UI components (`Button`, `Card`, etc.) | Presentacional | No | No |
| Widget (en `widgets/`) | Container complejo | Sí | Sí |
| Hook (`use*`) | Lógica reutilizable | Sí | — |

`'use client'` solo en componentes que usan `useState`, `useEffect`, stores, o event handlers. Los Server Components no llevan el directive.

---

### 1.1 App Shell — `(app)/layout.tsx`

```
AppShell                         ← Server Component (layout)
├── Providers                    ← 'use client' — QueryClient, Zustand hydration
│   └── [children]
├── Sidebar                      ← Widget, 'use client'
│   ├── BrandLogo               ← Presentacional (SC)
│   ├── NavMenu                  ← 'use client' (usePathname)
│   │   └── NavItem ×5          ← Presentacional
│   └── TidalConnectionStatus   ← 'use client' (reads auth.store)
│       └── SignOutPopover       ← 'use client'
├── [children]                   ← Área de contenido (slot)
├── DownloadPanel                ← Widget, 'use client', position:fixed
│   ├── DownloadPanelCollapsed  ← Presentacional
│   └── DownloadPanelExpanded   ← 'use client'
│       ├── DownloadPanelHeader ← Presentacional
│       └── DownloadJobList     ← 'use client'
│           └── DownloadJobItem ×N ← Presentacional
│               ├── JobProgress ← Presentacional
│               └── JobActions  ← 'use client' (opens Popover)
├── PlayerBar                    ← Widget, 'use client', position:fixed
│   ├── PlayerArtwork           ← Presentacional
│   ├── PlayerTrackInfo         ← Presentacional
│   ├── PlayerControls          ← 'use client'
│   ├── PlayerProgressSlider    ← 'use client'
│   └── PlayerVolume            ← 'use client'
└── SessionRecoveryModal         ← 'use client' (conditional render from auth.store)
    ├── SessionCheckingPhase    ← Presentacional
    ├── SessionActivePhase      ← Presentacional
    └── DeviceAuthPhase         ← 'use client' (countdown timer)
```

---

### 1.2 Dashboard Page — `(app)/dashboard/page.tsx`

```
DashboardPage                    ← Server Component (thin shell)
└── DashboardClient              ← 'use client' (top-level client boundary)
    ├── SearchInput              ← 'use client'
    │   └── UrlDetectionHint    ← Presentacional
    └── DashboardContent         ← 'use client' (conditional on searchState)
        │
        ├── [if searchState === 'empty']
        │   └── EmptyState      ← Presentacional (SC-compatible)
        │
        ├── [if searchState === 'url-loading']
        │   └── UrlPreviewSkeleton ← Presentacional
        │
        ├── [if searchState === 'url-preview']
        │   └── UrlPreview      ← 'use client'
        │       ├── AlbumPreviewCard ← Presentacional
        │       │   ├── CoverImage  ← Presentacional
        │       │   ├── AlbumMeta   ← Presentacional
        │       │   ├── QualityBadgeGroup ← Presentacional
        │       │   └── TrackPreviewList  ← 'use client'
        │       │       └── TrackPreviewRow ×N ← Presentacional
        │       └── DownloadCTA  ← 'use client' (QualitySelector + action)
        │           └── QualitySelector ← 'use client'
        │
        ├── [if searchState === 'results']
        │   └── SearchResults   ← 'use client'
        │       ├── ResultsToolbar ← 'use client'
        │       │   ├── ResultsTabs ← 'use client'
        │       │   └── ViewToggle  ← 'use client'
        │       ├── [if viewMode === 'grid']
        │       │   └── AlbumGrid ← Presentacional
        │       │       └── AlbumCard ×N ← 'use client' (hover, popover)
        │       │           ├── AlbumCardArtwork ← Presentacional
        │       │           ├── AlbumCardInfo    ← Presentacional
        │       │           ├── AlbumCardOverlay ← 'use client'
        │       │           │   ├── DownloadButton ← 'use client'
        │       │           │   └── QualitySelector ← 'use client'
        │       │           └── AlbumCardContextMenu ← 'use client'
        │       ├── [if viewMode === 'list']
        │       │   └── AlbumList ← Presentacional
        │       │       └── AlbumListRow ×N ← 'use client'
        │       └── [if results.length === 0]
        │           └── ZeroResults ← Presentacional
        │
        └── AlbumDetailPanel     ← 'use client' (drawer, 420px)
            ├── AlbumDetailHeader ← Presentacional
            ├── AlbumDetailCTA   ← 'use client' (QualitySelector + action)
            ├── TrackList        ← 'use client'
            │   └── TrackRow ×N  ← 'use client' (hover, individual download)
            └── AlbumMetadataSection ← Presentacional
```

---

## 2. Props Contracts

### 2.1 Entidades de dominio

```typescript
// entities/album/album.types.ts

export interface Album {
  id: string
  title: string
  artist: Artist
  coverUrl: string        // transformado desde cover ID de Tidal
  releaseYear: number
  releaseDate: string     // ISO 8601
  numberOfTracks: number
  durationSeconds: number
  audioQuality: AudioQuality
  audioModes: AudioMode[]
  upc: string
  label: Label
  genre?: string
}

export interface Artist {
  id: string
  name: string
}

export interface Label {
  id: string
  name: string
}

export type AudioQuality = 'MASTER' | 'HIRES' | 'HIGH' | 'NORMAL'
export type AudioMode = 'MQA' | 'SONY_360RA' | 'DOLBY_ATMOS' | 'STEREO'

// entities/track/track.types.ts

export interface Track {
  id: string
  title: string
  trackNumber: number
  durationSeconds: number
  audioQuality: AudioQuality
  audioModes: AudioMode[]
  isrc: string
  artist: Artist
  albumId: string
  albumTitle: string      // ← requerido por el Player Bar (wireframes-v2 §16)
  coverUrl: string
}

// entities/download-job/download-job.types.ts

export interface DownloadJob {
  id: string              // uuid generado en frontend al encolar
  albumId: string
  albumTitle: string
  artistName: string
  totalTracks: number
  completedTracks: number
  currentTrackFilename: string | null
  progressPercent: number // 0-100, album-level
  speedMbps: number | null
  etaSeconds: number | null
  status: DownloadJobStatus
  qualityOverride: AudioQuality | null  // null = usa settings.audioQuality
  error: DownloadJobError | null
  startedAt: string | null   // ISO 8601
  completedAt: string | null // ISO 8601
  outputPath: string | null  // ruta final en disco
}

export type DownloadJobStatus =
  | 'queued'
  | 'active'
  | 'paused'
  | 'completed'
  | 'error'

export interface DownloadJobError {
  code: number          // HTTP status code (403, 404, 500, etc.)
  message: string       // mensaje técnico del backend
  retriable: boolean
}

// entities/session/session.types.ts

export interface TidalUser {
  id: string
  email: string
  countryCode: string
  plan: 'FREE' | 'HIFI' | 'HIFI_PLUS'
}

export interface TidalSession {
  accessToken: string
  refreshToken: string
  expiresAt: string     // ISO 8601
  user: TidalUser
}

export interface DeviceAuthCode {
  userCode: string      // ej. "AB12-CD"
  verificationUri: string  // ej. "tidal.com/activate"
  expiresIn: number     // segundos
  interval: number      // polling interval en segundos
  deviceCode: string    // opaco, para el polling
}
```

---

### 2.2 Props de componentes críticos

```typescript
// widgets/download-panel/DownloadJobItem.tsx
export interface DownloadJobItemProps {
  job: DownloadJob
  glowActive: boolean     // ← de la regla de glows (max 2 simultáneos)
  onPause: (jobId: string) => void
  onResume: (jobId: string) => void
  onCancel: (jobId: string) => void
  onRetry: (jobId: string) => void
  onRemove: (jobId: string) => void
  onCheckSession: () => void  // abre SessionRecoveryModal
  onShowInExplorer: (outputPath: string) => void
}

// features/search/ui/AlbumCard.tsx
export interface AlbumCardProps {
  album: Album
  onOpenDetail: (album: Album) => void
  onDownload: (album: Album, quality: AudioQuality) => void
}

// features/search/ui/AlbumDetailPanel.tsx
export interface AlbumDetailPanelProps {
  albumId: string
  isOpen: boolean
  onClose: () => void
  onDownloadAlbum: (albumId: string, quality: AudioQuality) => void
  onDownloadTrack: (track: Track, quality: AudioQuality) => void
}

// features/album-detail/ui/QualitySelector.tsx
export interface QualitySelectorProps {
  availableQualities: AudioQuality[]  // del álbum/track
  selectedQuality: AudioQuality       // calidad actual (del Setting por defecto)
  onSelect: (quality: AudioQuality) => void
  size?: 'sm' | 'md'
  disabled?: boolean
}

// features/search/ui/SearchInput.tsx
export interface SearchInputProps {
  onSearch: (query: string) => void
  onUrlDetected: (url: string) => void
  onClear: () => void
  isLoading?: boolean
}

// features/auth/ui/SessionRecoveryModal.tsx
export interface SessionRecoveryModalProps {
  isOpen: boolean
  onClose: () => void
  onSessionRenewed: () => void
  // jobIdToRetry: cuando se abre desde un error de job,
  // al renovar la sesión se reinicia automáticamente ese job
  jobIdToRetry?: string
}

// widgets/player-bar/PlayerBar.tsx
export interface PlayerBarProps {
  // Sin props externas — lee de player.store directamente
  // Expuesto como widget sin props (pattern de widget autocontenido)
}

// shared/ui/Popover.tsx
export interface PopoverProps {
  trigger: React.ReactNode
  content: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  className?: string
}

// shared/ui/ProgressBar.tsx
export interface ProgressBarProps {
  value: number           // 0-100
  variant?: 'default' | 'download' | 'error' | 'success'
  size?: 'sm' | 'md'     // sm=2px, md=4px
  animated?: boolean
  className?: string
}

// shared/ui/Badge.tsx
export interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'format' | 'quality' | 'error' | 'success' | 'queue'
  className?: string
  title?: string          // para tooltip cuando el texto está truncado
}
```

---

## 3. Zustand Stores

### Principio de separación

- `auth.store` — sesión de Tidal (persistido en `localStorage`)
- `downloads.store` — cola de descargas + visibilidad del panel
- `player.store` — estado del reproductor
- `settings.store` — preferencias del usuario (persistido en `localStorage`)

No existe `library.store`. El estado de búsqueda es servidor (TanStack Query) + UI local (`useState` en `DashboardClient`).

---

### 3.1 auth.store.ts

```typescript
// features/auth/model/auth.store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TidalUser, DeviceAuthCode } from '@/entities/session/session.types'

type SessionStatus = 'authenticated' | 'expired' | 'unauthenticated'

interface AuthState {
  // State
  status: SessionStatus
  user: TidalUser | null
  accessToken: string | null
  expiresAt: string | null      // ISO 8601

  // Device Auth (flujo G-recovery)
  deviceAuth: DeviceAuthCode | null
  isCheckingSession: boolean
  isRecoveryModalOpen: boolean
}

interface AuthActions {
  setAuthenticated: (user: TidalUser, token: string, expiresAt: string) => void
  setExpired: () => void
  clearSession: () => void
  setDeviceAuth: (deviceAuth: DeviceAuthCode) => void
  clearDeviceAuth: () => void
  setCheckingSession: (checking: boolean) => void
  openRecoveryModal: () => void
  closeRecoveryModal: () => void
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      // Initial state
      status: 'unauthenticated',
      user: null,
      accessToken: null,
      expiresAt: null,
      deviceAuth: null,
      isCheckingSession: false,
      isRecoveryModalOpen: false,

      // Actions
      setAuthenticated: (user, token, expiresAt) =>
        set({ status: 'authenticated', user, accessToken: token, expiresAt }),

      setExpired: () =>
        set({ status: 'expired', accessToken: null }),

      clearSession: () =>
        set({
          status: 'unauthenticated',
          user: null,
          accessToken: null,
          expiresAt: null,
          deviceAuth: null,
        }),

      setDeviceAuth: (deviceAuth) => set({ deviceAuth }),
      clearDeviceAuth: () => set({ deviceAuth: null }),
      setCheckingSession: (isCheckingSession) => set({ isCheckingSession }),
      openRecoveryModal: () => set({ isRecoveryModalOpen: true }),
      closeRecoveryModal: () => set({ isRecoveryModalOpen: false, deviceAuth: null }),
    }),
    {
      name: 'music4all-auth',
      // Solo persistir user y expiresAt, NO el accessToken en localStorage
      // El accessToken se guarda en httpOnly cookie via el backend
      partialize: (state) => ({
        status: state.status,
        user: state.user,
        expiresAt: state.expiresAt,
      }),
    }
  )
)

// Selectors
export const selectIsAuthenticated = (s: AuthState) => s.status === 'authenticated'
export const selectUser = (s: AuthState) => s.user
export const selectIsExpired = (s: AuthState) => s.status === 'expired'
```

---

### 3.2 downloads.store.ts

```typescript
// features/downloads/model/downloads.store.ts
import { create } from 'zustand'
import type { DownloadJob, AudioQuality } from '@/entities/download-job/download-job.types'

interface DownloadsState {
  queue: DownloadJob[]
  isPanelVisible: boolean
  isPanelExpanded: boolean
}

interface DownloadsActions {
  enqueue: (job: Omit<DownloadJob, 'id' | 'status' | 'progressPercent' | 'completedTracks' | 'currentTrackFilename' | 'speedMbps' | 'etaSeconds' | 'error' | 'startedAt' | 'completedAt' | 'outputPath'>) => void
  updateJob: (jobId: string, updates: Partial<DownloadJob>) => void
  removeJob: (jobId: string) => void
  clearCompleted: () => void
  setPanelVisible: (visible: boolean) => void
  setPanelExpanded: (expanded: boolean) => void
}

export const useDownloadsStore = create<DownloadsState & DownloadsActions>((set, get) => ({
  queue: [],
  isPanelVisible: false,
  isPanelExpanded: true,

  enqueue: (jobData) => {
    const newJob: DownloadJob = {
      ...jobData,
      id: crypto.randomUUID(),
      status: 'queued',
      progressPercent: 0,
      completedTracks: 0,
      currentTrackFilename: null,
      speedMbps: null,
      etaSeconds: null,
      error: null,
      startedAt: null,
      completedAt: null,
      outputPath: null,
    }
    set((state) => ({
      queue: [...state.queue, newJob],
      isPanelVisible: true,
    }))
  },

  updateJob: (jobId, updates) =>
    set((state) => ({
      queue: state.queue.map((job) =>
        job.id === jobId ? { ...job, ...updates } : job
      ),
    })),

  removeJob: (jobId) =>
    set((state) => {
      const newQueue = state.queue.filter((j) => j.id !== jobId)
      return {
        queue: newQueue,
        isPanelVisible: newQueue.length > 0,
      }
    }),

  clearCompleted: () =>
    set((state) => ({
      queue: state.queue.filter((j) => j.status !== 'completed'),
    })),

  setPanelVisible: (isPanelVisible) => set({ isPanelVisible }),
  setPanelExpanded: (isPanelExpanded) => set({ isPanelExpanded }),
}))

// Selectors (usar con useShallow para evitar re-renders innecesarios)
export const selectActiveJobs = (s: DownloadsState) =>
  s.queue.filter((j) => j.status === 'active')

export const selectQueuedJobs = (s: DownloadsState) =>
  s.queue.filter((j) => j.status === 'queued')

export const selectCompletedJobs = (s: DownloadsState) =>
  s.queue.filter((j) => j.status === 'completed')

export const selectErrorJobs = (s: DownloadsState) =>
  s.queue.filter((j) => j.status === 'error')

// Glow rule: máx 2 glows simultáneos (wireframes-v2 §3)
// Si el player está activo, solo 1 job puede tener glow.
// Si el player está inactivo, hasta 2 jobs pueden tener glow.
export const selectGlowEligibleJobIds = (
  queue: DownloadJob[],
  isPlayerActive: boolean
): Set<string> => {
  const activeJobs = queue.filter((j) => j.status === 'active')
  const maxGlows = isPlayerActive ? 1 : 2
  return new Set(activeJobs.slice(0, maxGlows).map((j) => j.id))
}

export const selectAverageProgress = (s: DownloadsState): number => {
  const active = selectActiveJobs(s)
  if (active.length === 0) return 0
  return Math.round(active.reduce((sum, j) => sum + j.progressPercent, 0) / active.length)
}
```

---

### 3.3 player.store.ts

```typescript
// features/player/model/player.store.ts
import { create } from 'zustand'
import type { Track } from '@/entities/track/track.types'

interface PlayerState {
  currentTrack: Track | null
  isPlaying: boolean
  progressSeconds: number
  volume: number          // 0-1
  queue: Track[]
  queueIndex: number
}

interface PlayerActions {
  play: (track: Track, queue?: Track[]) => void
  pause: () => void
  resume: () => void
  next: () => void
  previous: () => void
  seek: (seconds: number) => void
  setVolume: (volume: number) => void
  setProgress: (seconds: number) => void  // llamado por el audio engine
  clearQueue: () => void
}

export const usePlayerStore = create<PlayerState & PlayerActions>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  progressSeconds: 0,
  volume: 0.8,
  queue: [],
  queueIndex: 0,

  play: (track, queue) =>
    set({
      currentTrack: track,
      isPlaying: true,
      progressSeconds: 0,
      queue: queue ?? [track],
      queueIndex: queue ? queue.findIndex((t) => t.id === track.id) : 0,
    }),

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),

  next: () => {
    const { queue, queueIndex } = get()
    const nextIndex = queueIndex + 1
    if (nextIndex < queue.length) {
      set({ currentTrack: queue[nextIndex], queueIndex: nextIndex, progressSeconds: 0 })
    }
  },

  previous: () => {
    const { queue, queueIndex, progressSeconds } = get()
    if (progressSeconds > 3) {
      set({ progressSeconds: 0 })
      return
    }
    const prevIndex = queueIndex - 1
    if (prevIndex >= 0) {
      set({ currentTrack: queue[prevIndex], queueIndex: prevIndex, progressSeconds: 0 })
    }
  },

  seek: (seconds) => set({ progressSeconds: seconds }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  setProgress: (progressSeconds) => set({ progressSeconds }),
  clearQueue: () => set({ currentTrack: null, isPlaying: false, queue: [], queueIndex: 0 }),
}))

// Selectors
export const selectIsPlayerActive = (s: PlayerState) => s.isPlaying
export const selectCurrentTrack = (s: PlayerState) => s.currentTrack
export const selectProgressPercent = (s: PlayerState): number => {
  if (!s.currentTrack) return 0
  return (s.progressSeconds / s.currentTrack.durationSeconds) * 100
}
```

---

### 3.4 settings.store.ts

```typescript
// features/settings/model/settings.store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AudioQuality } from '@/entities/album/album.types'

type ViewMode = 'grid' | 'list'
type ResultsTab = 'albums' | 'tracks' | 'playlists'

interface SettingsState {
  audioQuality: AudioQuality
  downloadPath: string
  concurrentDownloads: number      // 1-5
  viewMode: ViewMode
  lastResultsTab: ResultsTab
}

interface SettingsActions {
  setAudioQuality: (quality: AudioQuality) => void
  setDownloadPath: (path: string) => void
  setConcurrentDownloads: (count: number) => void
  setViewMode: (mode: ViewMode) => void
  setLastResultsTab: (tab: ResultsTab) => void
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      audioQuality: 'MASTER',
      downloadPath: '',        // vacío = carpeta de descargas del OS
      concurrentDownloads: 2,
      viewMode: 'grid',
      lastResultsTab: 'albums',

      setAudioQuality: (audioQuality) => set({ audioQuality }),
      setDownloadPath: (downloadPath) => set({ downloadPath }),
      setConcurrentDownloads: (concurrentDownloads) =>
        set({ concurrentDownloads: Math.max(1, Math.min(5, concurrentDownloads)) }),
      setViewMode: (viewMode) => set({ viewMode }),
      setLastResultsTab: (lastResultsTab) => set({ lastResultsTab }),
    }),
    { name: 'music4all-settings' }
  )
)
```

---

## 4. TanStack Query Layer

### 4.1 Query Key Factory

```typescript
// shared/api/query-keys.ts
export const queryKeys = {
  search: {
    all: ['search'] as const,
    results: (query: string, tab: string) =>
      ['search', 'results', query, tab] as const,
  },
  url: {
    resolve: (url: string) => ['url', 'resolve', url] as const,
  },
  album: {
    all: ['album'] as const,
    detail: (albumId: string) => ['album', 'detail', albumId] as const,
    tracks: (albumId: string) => ['album', 'tracks', albumId] as const,
  },
  session: {
    status: ['session', 'status'] as const,
    deviceAuth: ['session', 'device-auth'] as const,
  },
  downloads: {
    jobs: ['downloads', 'jobs'] as const,
  },
} as const
```

---

### 4.2 useSearchQuery

```typescript
// features/search/model/search.queries.ts
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/query-keys'
import { searchApi } from '../api/search.api'

export function useSearchQuery(query: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.search.results(query, 'all'),
    queryFn: () => searchApi.search(query),
    enabled: enabled && query.trim().length >= 2,
    staleTime: 5 * 60 * 1000,         // 5 minutos — resultados de búsqueda no cambian frecuente
    gcTime: 10 * 60 * 1000,           // 10 minutos en cache tras desmonte
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    placeholderData: (prev) => prev,   // muestra resultados anteriores mientras carga (keepPreviousData)
  })
}
```

---

### 4.3 useResolveUrlQuery

```typescript
// features/search/model/search.queries.ts
export function useResolveUrlQuery(url: string | null) {
  return useQuery({
    queryKey: queryKeys.url.resolve(url ?? ''),
    queryFn: () => searchApi.resolveUrl(url!),
    enabled: url !== null && isValidTidalUrl(url),
    staleTime: 10 * 60 * 1000,        // la URL de un álbum no cambia
    gcTime: 15 * 60 * 1000,
    retry: 1,                          // una sola reintento — si falla es probable que sea 404
    retryDelay: 1000,
  })
}

function isValidTidalUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.hostname.includes('tidal.com') && parsed.pathname.length > 1
  } catch {
    return false
  }
}
```

---

### 4.4 useAlbumDetailQuery

```typescript
// features/album-detail/model/album.queries.ts
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/query-keys'
import { albumApi } from '../api/album.api'

export function useAlbumDetailQuery(albumId: string | null) {
  return useQuery({
    queryKey: queryKeys.album.detail(albumId ?? ''),
    queryFn: () => albumApi.getAlbumDetail(albumId!),
    enabled: albumId !== null,
    staleTime: 15 * 60 * 1000,        // metadatos de álbum son estables
    gcTime: 30 * 60 * 1000,
    retry: 2,
  })
}
```

---

### 4.5 useSessionStatusQuery

```typescript
// features/auth/model/auth.queries.ts
import { useQuery, useMutation } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/query-keys'
import { authApi } from '../api/auth.api'

// Query manual (enabled: false por defecto — se activa cuando el usuario abre G-recovery)
export function useSessionStatusQuery() {
  return useQuery({
    queryKey: queryKeys.session.status,
    queryFn: authApi.checkSessionStatus,
    enabled: false,                    // activar con refetch() manualmente
    staleTime: 0,                      // siempre fresh cuando se consulta
    gcTime: 0,
    retry: 0,                          // si falla el check, no reintentar
  })
}

// Mutation para iniciar Device Auth
export function useInitDeviceAuthMutation() {
  return useMutation({
    mutationFn: authApi.initDeviceAuth,
    onSuccess: (data) => {
      useAuthStore.getState().setDeviceAuth(data)
    },
  })
}

// Polling de Device Auth (intervalo definido por el servidor, típicamente 5s)
export function useDeviceAuthPollingQuery(deviceCode: string | null) {
  return useQuery({
    queryKey: queryKeys.session.deviceAuth,
    queryFn: () => authApi.pollDeviceAuth(deviceCode!),
    enabled: deviceCode !== null,
    refetchInterval: 5000,             // poll cada 5 segundos
    refetchIntervalInBackground: false,
    retry: false,
    // Si devuelve 200, la sesión fue renovada
    // Si devuelve 428 (pending), continuar polling
    // Si devuelve 400 (expired), detener y mostrar error
  })
}
```

---

### 4.6 Cache Strategy Summary

| Query | staleTime | gcTime | Refetch on mount | Retry |
|---|---|---|---|---|
| `useSearchQuery` | 5 min | 10 min | Sí (si stale) | 2 intentos |
| `useResolveUrlQuery` | 10 min | 15 min | Sí (si stale) | 1 intento |
| `useAlbumDetailQuery` | 15 min | 30 min | Sí (si stale) | 2 intentos |
| `useSessionStatusQuery` | 0 | 0 | No (manual) | 0 |
| `useDeviceAuthPollingQuery` | 0 | 0 | No (polling) | No |

### 4.7 Invalidation Rules

```typescript
// Invalidar search cuando el usuario cambia la calidad por defecto
// (por si hay resultados cached con quality diferente)
queryClient.invalidateQueries({ queryKey: queryKeys.search.all })

// Invalidar session status después de Device Auth exitoso
queryClient.invalidateQueries({ queryKey: queryKeys.session.status })

// Invalidar album detail si el usuario editó metadatos (futuro)
queryClient.invalidateQueries({ queryKey: queryKeys.album.detail(albumId) })
```

---

## 5. API Contracts y DTOs

### 5.1 Endpoints del backend

| Método | Path | Descripción |
|---|---|---|
| `GET` | `/api/search?q={query}&limit=50` | Búsqueda de texto |
| `GET` | `/api/resolve?url={tidalUrl}` | Resolución de URL de Tidal |
| `GET` | `/api/albums/{albumId}` | Detalle de álbum |
| `GET` | `/api/albums/{albumId}/tracks` | Tracks de un álbum |
| `POST` | `/api/downloads` | Encolar descarga |
| `PATCH` | `/api/downloads/{jobId}` | Pausar/reanudar job |
| `DELETE` | `/api/downloads/{jobId}` | Cancelar job |
| `GET` | `/api/session/status` | Estado de sesión Tidal |
| `POST` | `/api/session/device-auth` | Iniciar Device Auth |
| `GET` | `/api/session/device-auth/{deviceCode}` | Polling de autorización |
| `WS` | `ws://localhost:8000/ws/downloads` | Progreso en tiempo real |

### 5.2 SearchResultsResponse

```typescript
interface SearchResultsResponse {
  albums: PaginatedList<AlbumDTO>
  tracks: PaginatedList<TrackDTO>
  playlists: PaginatedList<PlaylistDTO>
}

interface PaginatedList<T> {
  items: T[]
  totalNumberOfItems: number
  limit: number
  offset: number
}
```

```json
{
  "albums": {
    "items": [
      {
        "id": "230509486",
        "title": "OK Computer",
        "artist": { "id": "11069", "name": "Radiohead" },
        "cover": "ab9b5cd8-9b1b-4d8e-b0b0-b2d5b63f5d5d",
        "releaseDate": "1997-05-21",
        "numberOfTracks": 10,
        "duration": 2554,
        "audioQuality": "MASTER",
        "audioModes": ["MQA"],
        "upc": "075678245022",
        "label": { "id": "1234", "name": "EMI Records Ltd." }
      }
    ],
    "totalNumberOfItems": 8,
    "limit": 50,
    "offset": 0
  },
  "tracks": { "items": [], "totalNumberOfItems": 23, "limit": 50, "offset": 0 },
  "playlists": { "items": [], "totalNumberOfItems": 4, "limit": 50, "offset": 0 }
}
```

### 5.3 ResolveUrlResponse

```typescript
interface ResolveUrlResponse {
  type: 'album' | 'track' | 'playlist'
  id: string
  data: AlbumDTO | TrackDTO | PlaylistDTO
}
```

```json
{
  "type": "album",
  "id": "230509486",
  "data": {
    "id": "230509486",
    "title": "OK Computer",
    "artist": { "id": "11069", "name": "Radiohead" },
    "cover": "ab9b5cd8-9b1b-4d8e-b0b0-b2d5b63f5d5d",
    "releaseDate": "1997-05-21",
    "numberOfTracks": 10,
    "duration": 2554,
    "audioQuality": "MASTER",
    "audioModes": ["MQA"],
    "upc": "075678245022",
    "label": { "id": "1234", "name": "EMI Records Ltd." }
  }
}
```

### 5.4 AlbumDetailResponse

```typescript
interface AlbumDetailResponse {
  album: AlbumDTO
  tracks: TrackDTO[]
}
```

```json
{
  "album": {
    "id": "230509486",
    "title": "OK Computer",
    "artist": { "id": "11069", "name": "Radiohead" },
    "cover": "ab9b5cd8-9b1b-4d8e-b0b0-b2d5b63f5d5d",
    "releaseDate": "1997-05-21",
    "numberOfTracks": 10,
    "duration": 2554,
    "audioQuality": "MASTER",
    "audioModes": ["MQA"],
    "upc": "075678245022",
    "label": { "id": "1234", "name": "EMI Records Ltd." },
    "genre": "Alternative Rock"
  },
  "tracks": [
    {
      "id": "9812345",
      "title": "Airbag",
      "trackNumber": 1,
      "duration": 284,
      "audioQuality": "MASTER",
      "audioModes": ["MQA"],
      "isrc": "GB-EMI-97-01234",
      "artist": { "id": "11069", "name": "Radiohead" }
    }
  ]
}
```

### 5.5 DownloadJobResponse

Payload para `POST /api/downloads`:

```typescript
interface StartDownloadRequest {
  albumId?: string
  trackId?: string
  quality: AudioQuality      // calidad efectiva (override o default)
}

interface StartDownloadResponse {
  jobId: string              // ID del job en el backend
  status: 'queued' | 'active'
  estimatedTracks: number
}
```

```json
// Request
{ "albumId": "230509486", "quality": "MASTER" }

// Response
{ "jobId": "bcd123", "status": "queued", "estimatedTracks": 10 }
```

WebSocket message (streaming progress):

```typescript
interface DownloadProgressMessage {
  jobId: string
  type: 'progress' | 'completed' | 'error' | 'paused' | 'resumed'
  payload: DownloadProgressPayload | DownloadCompletedPayload | DownloadErrorPayload
}

interface DownloadProgressPayload {
  currentTrackFilename: string
  completedTracks: number
  totalTracks: number
  progressPercent: number
  speedMbps: number
  etaSeconds: number
}

interface DownloadCompletedPayload {
  outputPath: string
  completedAt: string  // ISO 8601
}

interface DownloadErrorPayload {
  code: number
  message: string
  retriable: boolean
  completedTracks: number
}
```

```json
{
  "jobId": "bcd123",
  "type": "progress",
  "payload": {
    "currentTrackFilename": "Airbag.flac",
    "completedTracks": 3,
    "totalTracks": 10,
    "progressPercent": 32,
    "speedMbps": 3.2,
    "etaSeconds": 105
  }
}
```

### 5.6 OAuthSessionResponse

```typescript
interface SessionStatusResponse {
  status: 'active' | 'expired'
  user?: TidalUser
  expiresAt?: string
}

interface DeviceAuthInitResponse {
  userCode: string          // "AB12-CD"
  verificationUri: string   // "tidal.com/activate"
  expiresIn: number         // 900 (15 minutos típicamente)
  interval: number          // 5 (poll cada 5s)
  deviceCode: string        // token opaco para polling
}

interface DeviceAuthPollResponse {
  status: 'pending' | 'authorized' | 'expired' | 'denied'
  session?: TidalSession    // presente solo cuando status === 'authorized'
}
```

```json
// GET /api/session/status
{ "status": "active", "user": { "id": "u123", "email": "picassoivan931@gmail.com", "plan": "HIFI" }, "expiresAt": "2026-06-03T12:00:00Z" }

// POST /api/session/device-auth
{ "userCode": "AB12-CD", "verificationUri": "tidal.com/activate", "expiresIn": 900, "interval": 5, "deviceCode": "eyJhbGciOiJ..." }

// GET /api/session/device-auth/{deviceCode} — mientras espera
{ "status": "pending" }

// GET /api/session/device-auth/{deviceCode} — cuando autorizado
{ "status": "authorized", "session": { "accessToken": "...", "refreshToken": "...", "expiresAt": "...", "user": {...} } }
```

### 5.7 Mapper de API a dominio

```typescript
// shared/api/mappers.ts — convierte snake_case del backend a camelCase del frontend

export function mapAlbumDTOToAlbum(dto: AlbumDTO): Album {
  return {
    id: dto.id,
    title: dto.title,
    artist: dto.artist,
    coverUrl: `https://resources.tidal.com/images/${dto.cover.replace(/-/g, '/')}/480x480.jpg`,
    releaseYear: new Date(dto.release_date).getFullYear(),
    releaseDate: dto.release_date,
    numberOfTracks: dto.number_of_tracks,
    durationSeconds: dto.duration,
    audioQuality: dto.audio_quality,
    audioModes: dto.audio_modes ?? [],
    upc: dto.upc,
    label: dto.label,
    genre: dto.genre,
  }
}

export function mapTrackDTOToTrack(dto: TrackDTO, album: Album): Track {
  return {
    id: dto.id,
    title: dto.title,
    trackNumber: dto.track_number,
    durationSeconds: dto.duration,
    audioQuality: dto.audio_quality,
    audioModes: dto.audio_modes ?? [],
    isrc: dto.isrc,
    artist: dto.artist,
    albumId: album.id,
    albumTitle: album.title,   // requerido por player.store
    coverUrl: album.coverUrl,
  }
}
```

---

## 6. Event Flow

### 6.1 Search Submitted

```
Usuario escribe texto + Enter en SearchInput
  │
  ▼
SearchInput.onSubmit()
  │  detecta que el input NO es una URL de Tidal
  │  (isValidTidalUrl(value) === false)
  │
  ▼
props.onSearch(query)   ← callback expuesto hacia DashboardClient
  │
  ▼
DashboardClient setState: { searchState: 'results', query }
  │
  ▼
React re-render → SearchResults monta
  │
  ▼
useSearchQuery(query, enabled=true) activa
  │  queryKey: ['search', 'results', query, 'all']
  │  Check cache → miss → HTTP GET /api/search?q=query
  │
  ▼
HTTP response → TanStack Query normaliza y cach
  │
  ▼
SearchResults renderiza AlbumGrid / AlbumList según viewMode
  │
  ▼
ResultsTabs muestra counts (Albums (8) / Tracks (23) / Playlists (4))
```

---

### 6.2 Album Opened (Detail Panel)

```
Usuario hace clic en el artwork de un AlbumCard (fuera del botón Download)
  │
  ▼
AlbumCard.onClick → props.onOpenDetail(album)
  │
  ▼
DashboardClient setState: { selectedAlbumId: album.id, isDetailPanelOpen: true }
  │
  ▼
AlbumDetailPanel monta con albumId
  │
  ▼
useAlbumDetailQuery(albumId) activa
  │  queryKey: ['album', 'detail', albumId]
  │  Check cache → HIT (si se buscó antes) o MISS → GET /api/albums/{albumId}
  │
  ▼
Panel renderiza con Framer Motion: translateX(100% → 0) en 250ms ease-out
  │
  ▼
Overlay rgba(0,0,0,0.4) aparece sobre el grid
  │
  ▼
Focus management: primer elemento focusable del panel recibe foco
  (el botón ✕ de cerrar)
```

---

### 6.3 Track Download Started (individual track)

```
Usuario hace hover sobre TrackRow en AlbumDetailPanel (o TrackPreviewRow en State B)
  │
  ▼
TrackRow muestra botón ↓ (visible al hover via CSS)
  │
  ▼
Usuario hace clic en ↓
  │
  ▼
QualitySelector inline muestra la calidad actual del Settings
  │
  ▼ [Si el usuario NO cambia la calidad]
  │  quality = settings.audioQuality
  │
  ▼ [Si el usuario abre el QualitySelector y elige otra]
  │  quality = qualityOverride (no modifica settings.audioQuality)
  │
  ▼
props.onDownloadTrack(track, quality)
  │
  ▼
HTTP POST /api/downloads { trackId: track.id, quality }
  │
  ▼
Response: { jobId: "xyz", status: "active", estimatedTracks: 1 }
  │
  ▼
useDownloadsStore.enqueue({
  albumId: track.albumId,
  albumTitle: track.albumTitle,
  artistName: track.artist.name,
  totalTracks: 1,
  qualityOverride: quality !== settings.audioQuality ? quality : null,
})
  │
  ▼
DownloadPanel aparece (isPanelVisible: true)
  │
  ▼
Toast "Download started" se muestra si el panel NO está visible
WebSocket comienza a enviar progress messages → useDownloadSocket actualiza el store
```

---

### 6.4 Album Download Started

```
Usuario hace clic en "↓ Download" (en State B, C overlay, o D)
  │
  ▼
[Opcionalmente: QualitySelector abierto, usuario elige calidad]
  │
  ▼
quality = qualityOverride ?? settings.audioQuality
  │
  ▼
HTTP POST /api/downloads { albumId, quality }
  │
  ▼
[Si viene desde State B]: DashboardClient setState: { searchState: 'empty' }
[Si viene desde State C overlay]: Card muestra indicador "queued" briefly, luego normal
[Si viene desde State D]: AlbumDetailPanel se cierra (isDetailPanelOpen: false)
  │
  ▼
useDownloadsStore.enqueue(...)
  │
  ▼
DownloadPanel: isPanelVisible = true, isPanelExpanded = true
  │
  ▼
Toast "Download started" (solo si isPanelVisible era false antes)
```

---

### 6.5 Job Paused / Resumed

```
Usuario hace clic en ⏸ de un DownloadJobItem
  │
  ▼
[Si status === 'active']
  HTTP PATCH /api/downloads/{jobId} { action: 'pause' }
  → useDownloadsStore.updateJob(jobId, { status: 'paused', speedMbps: null, etaSeconds: null })
  → Dot ● → ○, controles muestran ▶ (play) en lugar de ⏸

[Si status === 'paused']
  HTTP PATCH /api/downloads/{jobId} { action: 'resume' }
  → useDownloadsStore.updateJob(jobId, { status: 'active' })
  → Dot ○ → ●, controles muestran ⏸
  → WebSocket reanuda enviando progress messages
```

---

### 6.6 Job Cancelled

```
Usuario hace clic en ✕ de un DownloadJobItem
  │
  ▼
CancelPopover abre (Popover component, z-tooltip:600)
  │
  ▼
[Si usuario confirma "Cancel"]
  HTTP DELETE /api/downloads/{jobId}
  → useDownloadsStore.removeJob(jobId)
  → Si queue queda vacío: isPanelVisible = false
  → Toast "Download cancelled. N tracks saved." (solo si outputPath tenía tracks)

[Si usuario hace clic en "Keep Downloading"]
  Popover cierra. Sin cambios.
```

---

### 6.7 OAuth Renewed (G-recovery completo)

```
Usuario hace clic en "Check Session" desde:
  - DownloadJobItem en estado error, O
  - Toast de error (condicional)
  │
  ▼
useAuthStore.openRecoveryModal()
  → isRecoveryModalOpen: true
  → SessionRecoveryModal renderiza (Fase 1: verificando)
  │
  ▼
useSessionStatusQuery().refetch()  ← activación manual
  │
  ▼ [Fase 2a: Sesión activa]
  │  Response: { status: 'active', expiresAt: '...' }
  │  SessionRecoveryModal muestra SessionActivePhase
  │  CTA: "↻ Retry Download" → llama a onJobRetry(jobIdToRetry)
  │
  ▼ [Fase 2b: Sesión expirada]
  │  Response: { status: 'expired' }
  │  SessionRecoveryModal muestra DeviceAuthPhase
  │  │
  │  ▼
  │  HTTP POST /api/session/device-auth
  │  → useAuthStore.setDeviceAuth({ userCode, verificationUri, expiresIn, deviceCode })
  │  → DeviceAuthPhase renderiza código + URL + countdown
  │  → Shell API (Electron/Tauri): abre verificationUri en navegador del sistema
  │  │
  │  ▼ (polling cada 5s)
  │  useDeviceAuthPollingQuery(deviceCode)
  │  │
  │  ▼ [status === 'authorized']
  │  → useAuthStore.setAuthenticated(session.user, session.accessToken, session.expiresAt)
  │  → useAuthStore.clearDeviceAuth()
  │  → SessionRecoveryModal muestra Fase 3 (renovada)
  │  → queryClient.invalidateQueries(['session', 'status'])
  │  │
  │  ▼ [Si jobIdToRetry existe]
  │     HTTP PATCH /api/downloads/{jobIdToRetry} { action: 'resume' }
  │     → useDownloadsStore.updateJob(jobIdToRetry, { status: 'active', error: null })
  │
  ▼
useAuthStore.closeRecoveryModal()
```

---

## 7. Accessibility Specification

### 7.1 Roles y ARIA por componente

| Componente | Role | aria-label | Notas |
|---|---|---|---|
| `SearchInput` | `search` | "Search albums, tracks, or paste a Tidal URL" | El `<input>` tiene `role="searchbox"` |
| `AlbumCard` | `article` | `"{albumTitle} by {artistName}"` | |
| `AlbumCard` botón Download | `button` | `"Download {albumTitle} in {quality}"` | |
| `AlbumCardContextMenu` | — | `"More options for {albumTitle}"` | Trigger es `button` |
| `AlbumDetailPanel` | `dialog` | `"Album details: {albumTitle}"` | `aria-modal="true"` |
| `TrackRow` botón ↓ | `button` | `"Download {trackTitle}"` | |
| `DownloadPanel` | `region` | `"Downloads"` | `role="region"` para landmark |
| `DownloadJobItem` | `article` | `"Download job: {albumTitle}"` | |
| `ProgressBar` | `progressbar` | `"{albumTitle} download progress"` | `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=100` |
| `PlayerBar` | `region` | `"Music player"` | |
| `PlayerControls` play/pause | `button` | `"Play"` / `"Pause"` | cambia dinámicamente |
| `PlayerProgress` | `slider` | `"Track progress"` | `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| `SessionRecoveryModal` | `dialog` | `"Tidal session status"` | `aria-modal="true"` |
| `QualitySelector` | `listbox` | `"Select download quality"` | opciones son `option` role |
| `CancelPopover` | `dialog` | `"Confirm cancellation"` | `aria-modal="true"` |
| `Sidebar NavMenu` | `nav` | `"Main navigation"` | |
| `NavItem` activo | — | — | `aria-current="page"` |
| `ResultsTabs` | `tablist` | `"Search results"` | tabs tienen `role="tab"`, panels tienen `role="tabpanel"` |

---

### 7.2 Keyboard Navigation

| Contexto | Tecla | Acción |
|---|---|---|
| Global | `⌘K` (Mac) / `Ctrl+K` (Win) | Foco a SearchInput |
| Global | `Space` | Play/Pause (cuando no hay foco en input) |
| Global | `←` / `→` | Pista anterior/siguiente |
| Global | `↑` / `↓` | Volumen +10% / -10% |
| Global | `Escape` | Cerrar DetailPanel / Cerrar Modal / Cerrar Popover |
| AlbumGrid | `Tab` / `Shift+Tab` | Navegar entre cards |
| AlbumGrid card en foco | `Enter` | Abrir DetailPanel |
| AlbumGrid card en foco | `D` | Descargar (con calidad de Settings) |
| AlbumDetailPanel | `Tab` | Navegar entre elementos del panel |
| AlbumDetailPanel | `Escape` | Cerrar panel, foco regresa a la card que lo abrió |
| ResultsTabs | `←` / `→` | Navegar entre tabs |
| PlayerProgress slider | `←` / `→` | Seek -5s / +5s |
| PlayerProgress slider | `Home` / `End` | Ir al inicio / fin |
| Popover abierto | `Tab` | Navegar dentro del Popover (foco atrapado) |
| Popover abierto | `Escape` | Cerrar Popover |
| Modal abierto | `Tab` | Navegar dentro del Modal (foco atrapado) |
| Modal abierto | `Escape` | Cerrar Modal |

---

### 7.3 Focus Management

**AlbumDetailPanel:**
- Al abrir: `focus()` en el botón ✕ (primer elemento focusable del panel).
- Al cerrar: `focus()` regresa al `AlbumCard` que disparó la apertura. Usar `ref` para preservar el elemento trigger.
- Mientras abierto: el foco no debe escapar al grid (no `focus trap` completo, pero el overlay bloquea la interacción con el grid).

**SessionRecoveryModal:**
- Al abrir: `focus()` en el primer elemento de la Fase 1 (usualmente no hay elemento focusable — el spinner es decorativo). El modal completo recibe foco con `tabIndex={-1}` y `focus()` explícito.
- Al pasar a Fase 2b (DeviceAuth): `focus()` en el botón "↗ Open" de la URL.
- Al cerrar: `focus()` regresa al elemento que disparó la apertura.
- Implementar con `useFocusTrap` o la primitiva de Radix UI (`@radix-ui/react-dialog`).

**Popover de Cancel:**
- Al abrir: `focus()` en "Keep Downloading" (acción positiva primero).
- Al cerrar: `focus()` regresa al botón ✕ que lo abrió.

---

### 7.4 Live Regions

```typescript
// Anunciar cambios de estado de descarga para screen readers
<div aria-live="polite" aria-atomic="false" className="sr-only" id="download-status-announcer">
  {/* Actualizado vía JavaScript cuando jobs cambian de estado */}
</div>

// Ejemplos de mensajes:
// "Download started: OK Computer by Radiohead"
// "Download completed: OK Computer. 10 tracks saved."
// "Download error: OK Computer. Tidal returned 403."
```

---

### 7.5 Reducción de movimiento

```css
/* globals.css */
@media (prefers-reduced-motion: reduce) {
  /* Desactivar shimmer de skeletons */
  .skeleton { animation: none; }
  /* Desactivar glow animations */
  .glow-download, .glow-active { animation: none; }
  /* Reducir transiciones a 100ms */
  * { transition-duration: 100ms !important; }
}
```

---

## 8. Responsive Rules

El viewport de referencia de los wireframes es 1440×900px. La siguiente tabla define el comportamiento en viewports menores.

### 8.1 Breakpoints

| Nombre | Rango | CSS |
|---|---|---|
| Desktop grande | ≥ 1440px | `2xl:` |
| Desktop | 1024–1439px | `xl:` / base |
| Laptop pequeño | 768–1023px | `lg:` |
| Tablet | < 768px | *(no soportado en v1)* |

La app no tiene diseño mobile en v1. En tablet (< 768px), mostrar un mensaje: "Music 4 All is optimized for desktop. Please use a wider window."

---

### 8.2 Sidebar

| Viewport | Comportamiento |
|---|---|
| ≥ 1440px | Fijo 240px, siempre visible |
| 1024–1439px | Fijo 240px, siempre visible |
| 768–1023px | Colapsado a 64px (solo iconos), sin texto de nav items |
| < 768px | Oculto (mensaje de "no soportado") |

En viewport 768–1023px, el sidebar colapsado muestra solo los 5 iconos centrados y el dot de conexión Tidal. El logo se reduce a solo el cuadrado ■. Los tooltips del sistema (`title` attr) muestran el nombre del nav item al hover.

---

### 8.3 Content Area

| Viewport | Grid columns | Card min-width |
|---|---|---|
| ≥ 1440px | `auto-fill, minmax(180px, 1fr)` → ~5 cols | 180px |
| 1280–1439px | `auto-fill, minmax(160px, 1fr)` → ~5 cols | 160px |
| 1024–1279px | `auto-fill, minmax(150px, 1fr)` → ~4 cols | 150px |
| 768–1023px | `auto-fill, minmax(140px, 1fr)` → ~3 cols | 140px |

---

### 8.4 AlbumDetailPanel (Drawer)

| Viewport | Comportamiento |
|---|---|
| ≥ 1280px | 420px desde la derecha, contenido del grid permanece visible |
| 1024–1279px | 360px desde la derecha, contenido del grid comprimido |
| 768–1023px | Full-width bottom sheet (50vh), transición desde abajo |

En 768–1023px, el panel cambia de `translateX` a `translateY` (slide-up desde el fondo). El grid queda completamente cubierto.

```typescript
// Hook para detectar el comportamiento del panel
function useDetailPanelVariant(): 'drawer' | 'sheet' {
  const width = useWindowWidth()
  return width >= 1024 ? 'drawer' : 'sheet'
}
```

---

### 8.5 Download Panel (Fixed)

| Viewport | Comportamiento |
|---|---|
| ≥ 1024px | Full-width (sidebar + content area), 40px colapsado, hasta 320px expandido |
| 768–1023px | Full-width, mismo comportamiento, font-size reducido |

El panel fijo siempre tiene `left: 0` y `right: 0`. El sidebar está encima del panel (z-sticky: 200 > z-panel: 150) pero el panel llega hasta la izquierda — visualmente el sidebar lo superpone en esa columna.

```typescript
// Ajustar posición left del panel para estar visualmente alineado con el content area
// En desktop: el panel empieza en x=0 pero el sidebar lo cubre en los primeros 240px
// No es necesario ajustar — el panel va debajo del sidebar por el z-index
```

---

### 8.6 Player Bar

| Viewport | Comportamiento |
|---|---|
| ≥ 1440px | Full-width, todos los controles visibles |
| 1024–1439px | Full-width, vol control puede comprimirse |
| 768–1023px | Ocultar controles prev/next en viewports muy estrechos; solo play/pause + slider |

---

## 9. Error Handling Matrix

| Error | HTTP Code | Origen | UI mostrada | Acción disponible | Recovery Path |
|---|---|---|---|---|---|
| URL inválida / no reconocida | 400 | `resolveUrl` | Error inline en B-loading: "URL not recognized" | Clear input (✕) | Usuario corrige la URL |
| URL no encontrada en Tidal | 404 | `resolveUrl` | Error inline en B-loading: "Not found on Tidal" | Clear input (✕) | Usuario busca por texto |
| Sesión expirada | 401 / 403 | Cualquier API | Job en error + G-recovery modal (si panel visible) / Toast (si no visible) | Check Session → Device Auth | OAuth Device Auth flow |
| Rate limit | 429 | `search` / `downloads` | Toast: "Too many requests. Retrying in Ns..." | Auto-retry con delay del `Retry-After` header | Auto (TanStack Query retry) |
| Error de servidor genérico | 500 | Cualquier API | Toast: "Server error. Try again." | Botón Retry en el Toast | Retry manual |
| Error de servidor en download | 500 | Download job | Job en estado error en el panel | ↻ Retry en el job | Retry desde el job |
| WebSocket desconectado | — | WS | Panel: "`◌ Reconnecting...`" en lugar de métricas | Auto-reconnect (exponential backoff) | Auto (ws-client.ts) |
| Red offline | — | Fetch | Toast persistente: "No internet connection" | Ninguna (esperar red) | Auto (cuando red regresa) |
| Error de filesystem | — | Backend | Job en error: "Could not write to disk" | Open Settings → Change download folder | Manual |
| Álbum no disponible en región | 451 | `resolveUrl` / download | Toast: "Not available in your region" | Ninguna | No hay recovery |
| Límite de descargas concurrentes | 409 | `POST /downloads` | El job se encola automáticamente (no es error) | — | Auto (FIFO queue) |
| Código de Device Auth expirado | 400 | Polling | DeviceAuthPhase muestra error: "Code expired" + botón "Get new code" | Solicitar nuevo código | Reiniciar Device Auth flow |

### Implementación del error boundary

```typescript
// app/(app)/error.tsx — Next.js error boundary para el grupo (app)
'use client'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Solo para errores de rendering no manejados
  // Los errores de API se manejan en TanStack Query
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <p className="text-semantic-error font-mono text-sm">Unexpected error</p>
        <p className="text-text-secondary text-xs mt-2">{error.message}</p>
        <button onClick={reset} className="mt-4 text-teal-500 text-sm">
          Try again
        </button>
      </div>
    </div>
  )
}
```

---

## 10. File Structure

Estructura completa de archivos para implementar Dashboard v2. Los archivos marcados con `[NEW]` no existen en el codebase actual.

```
frontend/src/
│
├── app/
│   ├── layout.tsx                          ← Root layout (html, body, Providers)
│   ├── globals.css                         ← Tailwind base + CSS custom properties
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   └── (app)/
│       ├── layout.tsx                      ← [MODIFICAR] Monta Sidebar, DownloadPanel, PlayerBar, SessionRecoveryModal
│       ├── dashboard/
│       │   └── page.tsx                    ← [MODIFICAR] Shell mínimo → DashboardClient
│       ├── library/
│       │   └── page.tsx
│       ├── downloads/
│       │   └── page.tsx
│       ├── history/
│       │   └── page.tsx
│       ├── settings/
│       │   └── page.tsx
│       └── error.tsx                       ← [NEW] Error boundary del grupo (app)
│
├── widgets/
│   ├── sidebar/
│   │   ├── Sidebar.tsx                     ← [MODIFICAR]
│   │   ├── NavItem.tsx
│   │   ├── TidalConnectionStatus.tsx
│   │   ├── SignOutPopover.tsx              ← [NEW]
│   │   └── index.ts
│   ├── download-panel/
│   │   ├── DownloadPanel.tsx              ← [NEW] Wrapper fixed, z-panel:150
│   │   ├── DownloadPanelCollapsed.tsx     ← [NEW] "↓ N active · X% avg"
│   │   ├── DownloadPanelExpanded.tsx      ← [NEW] Lista completa de jobs
│   │   ├── DownloadPanelHeader.tsx        ← [NEW] "DOWNLOADS · Active:N · Queue:N · [Clear N]"
│   │   ├── DownloadJobItem.tsx            ← [NEW] Job individual con progress
│   │   ├── JobProgress.tsx               ← [NEW] ProgressBar + métricas
│   │   ├── JobActions.tsx                ← [NEW] ⏸ ✕ con Popover de confirmación
│   │   └── index.ts
│   └── player-bar/
│       ├── PlayerBar.tsx                  ← [MODIFICAR] height: 80px canónico
│       ├── PlayerArtwork.tsx
│       ├── PlayerTrackInfo.tsx
│       ├── PlayerControls.tsx
│       ├── PlayerProgressSlider.tsx
│       ├── PlayerVolume.tsx
│       └── index.ts
│
├── features/
│   ├── search/
│   │   ├── ui/
│   │   │   ├── SearchInput.tsx            ← [MODIFICAR] ⌘K hint, URL detection, readonly durante fetch
│   │   │   ├── UrlPreviewSkeleton.tsx     ← [NEW] Estado B-loading
│   │   │   ├── UrlPreview.tsx             ← [MODIFICAR] Añadir track download + QualitySelector
│   │   │   ├── AlbumPreviewCard.tsx       ← [NEW] Extraído de UrlPreview
│   │   │   ├── TrackPreviewList.tsx       ← [NEW] Lista con hover download
│   │   │   ├── TrackPreviewRow.tsx        ← [NEW] Fila con botón ↓
│   │   │   ├── SearchResults.tsx          ← [MODIFICAR]
│   │   │   ├── ResultsToolbar.tsx         ← [NEW] Tabs + ViewToggle en la misma línea
│   │   │   ├── ResultsTabs.tsx            ← [MODIFICAR]
│   │   │   ├── ViewToggle.tsx             ← [MODIFICAR]
│   │   │   ├── AlbumGrid.tsx
│   │   │   ├── AlbumCard.tsx              ← [MODIFICAR] Click target clarificado
│   │   │   ├── AlbumCardOverlay.tsx       ← [NEW] Overlay con botón delimitado + QualitySelector
│   │   │   ├── AlbumCardContextMenu.tsx   ← [NEW] Popover ⋯
│   │   │   ├── AlbumList.tsx              ← [NEW] Vista lista
│   │   │   ├── AlbumListRow.tsx           ← [NEW] Fila de álbum en lista
│   │   │   ├── ZeroResults.tsx            ← [NEW] Estado C-zero
│   │   │   └── EmptyState.tsx             ← [MODIFICAR] Player bar ya sin texto de guía
│   │   ├── model/
│   │   │   ├── search.queries.ts          ← useSearchQuery, useResolveUrlQuery
│   │   │   └── url-detection.utils.ts     ← [NEW] isValidTidalUrl, getTidalUrlType
│   │   ├── api/
│   │   │   └── search.api.ts
│   │   └── index.ts
│   │
│   ├── album-detail/
│   │   ├── ui/
│   │   │   ├── AlbumDetailPanel.tsx       ← [MODIFICAR] Añadir QualitySelector
│   │   │   ├── AlbumDetailHeader.tsx
│   │   │   ├── AlbumDetailCTA.tsx         ← [NEW] Botón Download + QualitySelector
│   │   │   ├── TrackList.tsx
│   │   │   ├── TrackRow.tsx               ← [MODIFICAR] Consistente con TrackPreviewRow
│   │   │   ├── AlbumMetadataSection.tsx   ← [NEW] UPC, ISRC, Label, Genre + icono ✎ reservado
│   │   │   └── QualitySelector.tsx        ← [NEW] Componente compartido
│   │   ├── model/
│   │   │   └── album.queries.ts           ← useAlbumDetailQuery
│   │   ├── api/
│   │   │   └── album.api.ts
│   │   └── index.ts
│   │
│   ├── downloads/
│   │   ├── hooks/
│   │   │   └── useDownloadSocket.ts       ← [MODIFICAR] Actualiza store con messages del WS
│   │   ├── model/
│   │   │   └── downloads.store.ts         ← [NEW - reescribir] Ver §3.2
│   │   ├── api/
│   │   │   └── downloads.api.ts
│   │   └── index.ts
│   │
│   ├── auth/
│   │   ├── ui/
│   │   │   ├── SessionRecoveryModal.tsx   ← [NEW] Modal 3 fases (G-recovery)
│   │   │   ├── SessionCheckingPhase.tsx   ← [NEW]
│   │   │   ├── SessionActivePhase.tsx     ← [NEW]
│   │   │   └── DeviceAuthPhase.tsx        ← [NEW] URL + código + countdown + polling
│   │   ├── model/
│   │   │   ├── auth.store.ts              ← [MODIFICAR] Añadir deviceAuth, isRecoveryModalOpen
│   │   │   └── auth.queries.ts            ← [NEW] useSessionStatusQuery, useDeviceAuthPollingQuery
│   │   ├── api/
│   │   │   └── auth.api.ts
│   │   └── index.ts
│   │
│   ├── player/
│   │   ├── model/
│   │   │   └── player.store.ts            ← [MODIFICAR] Añadir albumTitle a Track
│   │   └── index.ts
│   │
│   └── settings/
│       ├── model/
│       │   └── settings.store.ts          ← [MODIFICAR] Añadir lastResultsTab
│       └── index.ts
│
├── entities/
│   ├── album/
│   │   ├── album.types.ts                 ← [MODIFICAR] Ver §2.1
│   │   └── album.utils.ts
│   ├── track/
│   │   ├── track.types.ts                 ← [MODIFICAR] Añadir albumTitle, albumId
│   │   └── track.utils.ts
│   ├── playlist/
│   │   └── playlist.types.ts
│   ├── download-job/
│   │   ├── download-job.types.ts          ← [MODIFICAR] Añadir qualityOverride, outputPath
│   │   └── download-job.utils.ts
│   └── session/
│       └── session.types.ts               ← [NEW] TidalUser, TidalSession, DeviceAuthCode
│
└── shared/
    ├── api/
    │   ├── client.ts                      ← HTTP client base (fetch + auth headers)
    │   ├── ws-client.ts                   ← WebSocket con reconnect exponencial
    │   ├── query-client.ts                ← QueryClient config
    │   ├── query-keys.ts                  ← [NEW] Factory de query keys (§4.1)
    │   └── mappers.ts                     ← [NEW] DTO → domain mappers (§5.7)
    ├── ui/
    │   ├── Button.tsx
    │   ├── Input.tsx
    │   ├── Card.tsx
    │   ├── Modal.tsx
    │   ├── Toast.tsx
    │   ├── Badge.tsx
    │   ├── ProgressBar.tsx
    │   ├── Tooltip.tsx
    │   ├── Tabs.tsx
    │   ├── Popover.tsx                    ← [NEW] §2.2 + Design System §3.X
    │   ├── Skeleton.tsx                   ← [NEW] Para Estado B-loading
    │   └── index.ts
    ├── hooks/
    │   ├── useDebounce.ts
    │   ├── useLocalStorage.ts
    │   ├── useUrlDetection.ts             ← [NEW] onPaste + debounce para SearchInput
    │   ├── useKeyboardShortcuts.ts        ← [NEW] ⌘K, Space, ←→, ↑↓, Escape global
    │   └── useWindowWidth.ts              ← [NEW] Para responsive rules
    ├── config/
    │   ├── api.config.ts
    │   └── ws.config.ts
    ├── lib/
    │   ├── cn.ts                          ← clsx + tailwind-merge
    │   ├── format.ts                      ← formatDuration, formatFileSize, formatEta
    │   └── errors.ts                      ← ApiError class, parseApiError
    └── types/
        ├── api.types.ts
        └── common.types.ts
```

---

## 11. Implementation Priority

Las fases tienen dependencias estrictas. No comenzar una fase sin completar sus prerrequisitos.

---

### Fase 1 — Design System (Base)

**Objetivo:** Todos los componentes base de `shared/ui/` implementados y probados aisladamente.

**Archivos:**
```
shared/ui/Button.tsx
shared/ui/Input.tsx
shared/ui/Card.tsx
shared/ui/Badge.tsx        ← máx 8 chars enforced
shared/ui/ProgressBar.tsx  ← variantes: default, download, error, success
shared/ui/Tooltip.tsx
shared/ui/Popover.tsx      ← [NEW] sin esto no se puede hacer Cancel ni QualitySelector
shared/ui/Skeleton.tsx     ← [NEW] sin esto no se puede hacer B-loading
shared/ui/Tabs.tsx
shared/ui/Toast.tsx
shared/ui/Modal.tsx
shared/lib/cn.ts
shared/lib/format.ts       ← formatDuration(seconds), formatEta(seconds), formatSpeed(mbps)
globals.css                ← CSS custom properties: --surface-void, --teal-500, etc.
```

**Criterio de éxito:** Todos los componentes renderizan correctamente en Storybook (o página de sandbox). Los tokens de color del Design System están en CSS variables aplicadas via Tailwind config.

**Dependencias:** Ninguna.

---

### Fase 2 — Layout Shell

**Objetivo:** El shell de la app funciona con navegación real, sidebar y player bar vacío.

**Archivos:**
```
app/layout.tsx             ← Providers (QueryClient, Zustand)
app/(app)/layout.tsx       ← Sidebar + DownloadPanel (placeholder) + PlayerBar (empty) + SessionRecoveryModal (hidden)
widgets/sidebar/           ← Todos los archivos
widgets/player-bar/        ← Player bar con estado vacío ("⊘ Nothing playing")
features/settings/model/settings.store.ts
features/auth/model/auth.store.ts
app/(app)/dashboard/page.tsx  ← Placeholder con "Dashboard coming soon"
```

**Criterio de éxito:** La app carga, el sidebar muestra los 5 nav items, el player bar muestra "Nothing playing", la navegación entre rutas funciona. TidalConnectionStatus muestra el estado correcto (usa auth.store).

**Dependencias:** Fase 1.

---

### Fase 3 — Search (Estados A, B-loading, B, C, C-list, C-zero)

**Objetivo:** El flujo de búsqueda completo funciona end-to-end.

**Archivos:**
```
shared/api/client.ts
shared/api/query-client.ts
shared/api/query-keys.ts
shared/api/mappers.ts
shared/hooks/useUrlDetection.ts
shared/hooks/useKeyboardShortcuts.ts    ← ⌘K global
features/search/                        ← Todos los archivos de UI y model
features/search/api/search.api.ts
entities/album/album.types.ts
entities/track/track.types.ts
app/(app)/dashboard/page.tsx            ← DashboardClient completo
```

**Criterio de éxito:**
- Estado A: Muestra la ilustración, autoFocus en input, ⌘K funciona
- Estado B-loading: Al pegar URL, skeleton aparece inmediatamente
- Estado B: Preview completa con track list y descarga individual (sin backend real, mock)
- Estado C: Grid de resultados con 5 columnas, click target correcto en AlbumCard
- Estado C-list: Toggle ≡ cambia a vista lista
- Estado C-zero: Osciloscopio cuando 0 resultados

**Dependencias:** Fases 1, 2.

---

### Fase 4 — Album Detail Panel (Estado D)

**Objetivo:** El panel lateral de detalle funciona con datos reales.

**Archivos:**
```
features/album-detail/                  ← Todos los archivos
features/album-detail/ui/QualitySelector.tsx  ← Usado en múltiples componentes
```

**Criterio de éxito:**
- Clic en artwork abre el panel con slide-in
- Panel muestra tracks, metadata, badges de calidad (máx 8 chars)
- QualitySelector funciona (cambia la calidad del botón Download sin modificar Settings)
- Escape cierra el panel, foco regresa a la card
- Hover en TrackRow muestra botón ↓

**Dependencias:** Fases 1, 2, 3.

---

### Fase 5 — Downloads (Estados E, F, G)

**Objetivo:** El Download Panel fijo funciona con WebSocket real.

**Archivos:**
```
widgets/download-panel/                 ← Todos los archivos
features/downloads/model/downloads.store.ts
features/downloads/hooks/useDownloadSocket.ts
features/downloads/api/downloads.api.ts
entities/download-job/download-job.types.ts
```

**Criterio de éxito:**
- Iniciar una descarga desde Estado B, C u D añade un job al store
- Download Panel aparece como elemento fijo (no inline, no layout shift)
- Progress se actualiza via WebSocket en tiempo real
- Pause/Resume funcionan
- Cancel abre Popover de confirmación
- Regla de glows: máx 2 simultáneos
- Panel colapsa/expande sin mover el contenido
- Estado E → F cuando hay múltiples jobs
- Estado G cuando el backend devuelve error

**Dependencias:** Fases 1, 2, 3, 4.

---

### Fase 6 — OAuth Recovery (Estado G-recovery)

**Objetivo:** El flujo completo de recuperación de sesión funciona.

**Archivos:**
```
features/auth/ui/SessionRecoveryModal.tsx
features/auth/ui/SessionCheckingPhase.tsx
features/auth/ui/SessionActivePhase.tsx
features/auth/ui/DeviceAuthPhase.tsx
features/auth/model/auth.queries.ts
features/auth/api/auth.api.ts
entities/session/session.types.ts
```

**Criterio de éxito:**
- "Check Session" desde un job en error abre el modal
- Fase 1: spinner de verificación visible
- Fase 2a: si sesión activa, muestra expiry y CTA Retry
- Fase 2b: si expirada, muestra código + URL, el código hace countdown
- Abre URL en navegador del sistema (no en la app)
- Polling detecta autorización → Fase 3 → sesión renovada → job reintenta
- Focus management correcto en todas las fases

**Dependencias:** Fases 1, 2, 5.

---

### Fase 7 — Polish

**Objetivo:** Animaciones, accesibilidad y responsive rules completos.

**Tareas:**
- Framer Motion en todas las transiciones documentadas en §17 de los wireframes
- `prefers-reduced-motion` respetado
- ARIA roles y labels en todos los componentes (§7.1)
- Focus trapping en Modal y Popover
- Live regions para screen readers (§7.4)
- Responsive: sidebar colapsado en 768–1023px
- AlbumDetailPanel como bottom sheet en 768–1023px
- Pruebas de keyboard navigation end-to-end
- Error boundary `app/(app)/error.tsx`
- Animación de entrada de la ilustración del Estado A

**Dependencias:** Todas las fases anteriores.

---

### Dependencias entre fases (grafo)

```
Fase 1 (Design System)
    │
    ▼
Fase 2 (Layout Shell)
    │
    ▼
Fase 3 (Search)
    │
    ▼
Fase 4 (Album Detail) ──────────┐
    │                            │
    ▼                            ▼
Fase 5 (Downloads) ─────► Fase 6 (OAuth Recovery)
    │
    ▼
Fase 7 (Polish)
```

Fase 4 y Fase 5 pueden trabajarse en paralelo por equipos distintos si la API está mockeada. Fase 6 requiere Fase 5 completa (el error de job es el trigger principal del modal).

---

*Music 4 All — Frontend Implementation Specification v1.0 · Junio 2026*  
*Autor: Principal Product Designer / Tech Lead*  
*Fuente: `docs/wireframes-dashboard-v2.md` · `docs/frontend-architecture.md` · `docs/design-system.md`*
