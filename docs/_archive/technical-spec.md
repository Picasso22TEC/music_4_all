# Music 4 All — Technical Specification v1.0

> Junio 2026 · Para uso inmediato del equipo de desarrollo  
> Prerrequisito: `docs/frontend-implementation-spec.md` (congelado — no reabrir decisiones de UX)  
> Codebase actual analizado en: `frontend/src/` (15 archivos fuente)

---

## Índice

1. [API Contract Specification](#1-api-contract-specification)
2. [Domain Models](#2-domain-models)
3. [Query Architecture](#3-query-architecture)
4. [Zustand Store Specification](#4-zustand-store-specification)
5. [WebSocket Protocol](#5-websocket-protocol)
6. [Component Implementation Checklist](#6-component-implementation-checklist)
7. [Testing Specification](#7-testing-specification)
8. [Migration Plan](#8-migration-plan)
9. [Developer Task Breakdown](#9-developer-task-breakdown)
10. [Definition of Done](#10-definition-of-done)

---

## 1. API Contract Specification

### Convenciones globales

```
Base URL:       http://localhost:8000      (dev)
                http://backend:8000        (Docker)
Prefix:         /api
Content-Type:   application/json
Auth:           Cookie: session_id=<token> (httpOnly, set por el backend)
Naming:         snake_case en DTOs de transporte
Versioning:     Ninguno en v1. Header X-API-Version: 1 informativo.
Null vs absent: Los campos opcionales ausentes se omiten (no se envían como null).
                Los campos nulos se envían explícitamente como null.
```

**Headers en todo request autenticado:**
```
Cookie: session_id=<token>
Content-Type: application/json
Accept: application/json
```

**Estructura de error uniforme:**
```json
{
  "error": {
    "code": "SESSION_EXPIRED",
    "message": "Tidal session has expired",
    "http_status": 403,
    "retriable": true
  }
}
```

| `error.code` | HTTP | Situación |
|---|---|---|
| `INVALID_URL` | 400 | URL no reconocida o malformada |
| `NOT_FOUND` | 404 | Recurso no existe en Tidal |
| `SESSION_EXPIRED` | 403 | Token de Tidal expirado |
| `UNAUTHORIZED` | 401 | Sin cookie de sesión |
| `RATE_LIMITED` | 429 | Rate limit de Tidal API |
| `REGION_BLOCKED` | 451 | Álbum no disponible en la región |
| `CONFLICT` | 409 | Job ya existe para ese albumId |
| `SERVER_ERROR` | 500 | Error interno del backend |

---

### 1.1 GET /api/search

Búsqueda de texto libre. Devuelve álbumes, tracks y playlists en un solo response.

**Query params:**

| Param | Tipo | Requerido | Default | Descripción |
|---|---|---|---|---|
| `q` | `string` | Sí | — | Query de búsqueda (mínimo 2 chars) |
| `limit` | `integer` | No | `50` | Máx resultados por tipo (1–50) |
| `offset` | `integer` | No | `0` | Paginación |

**Request:**
```
GET /api/search?q=radiohead+ok+computer&limit=50
```

**Response 200:**
```json
{
  "albums": {
    "items": [
      {
        "id": "230509486",
        "title": "OK Computer",
        "artist": { "id": "11069", "name": "Radiohead" },
        "cover": "ab9b5cd8-9b1b-4d8e-b0b0-b2d5b63f5d5d",
        "release_date": "1997-05-21",
        "number_of_tracks": 10,
        "duration": 2554,
        "audio_quality": "MASTER",
        "audio_modes": ["MQA"]
      }
    ],
    "total_number_of_items": 8,
    "limit": 50,
    "offset": 0
  },
  "tracks": {
    "items": [
      {
        "id": "9812345",
        "title": "Paranoid Android",
        "track_number": 2,
        "duration": 383,
        "audio_quality": "MASTER",
        "audio_modes": ["MQA"],
        "isrc": "GB-EMI-97-01235",
        "artist": { "id": "11069", "name": "Radiohead" },
        "album": { "id": "230509486", "title": "OK Computer" }
      }
    ],
    "total_number_of_items": 23,
    "limit": 50,
    "offset": 0
  },
  "playlists": {
    "items": [],
    "total_number_of_items": 4,
    "limit": 50,
    "offset": 0
  }
}
```

**Errores posibles:** 400 (q vacío), 401, 429, 500.

> **Gap vs backend actual:** El endpoint actual es `GET /api/metadata/search` y devuelve `{ results: SearchResult[], total }` — lista plana sin separación por tipo. El backend debe añadir el nuevo endpoint `/api/search` con la estructura tipada por entidad.

---

### 1.2 GET /api/resolve

Resuelve una URL de Tidal a su entidad correspondiente. Usado en el Estado B-loading.

**Query params:**

| Param | Tipo | Requerido | Descripción |
|---|---|---|---|
| `url` | `string` | Sí | URL completa de Tidal (URL-encoded) |

**Request:**
```
GET /api/resolve?url=https%3A%2F%2Ftidal.com%2Fbrowse%2Falbum%2F230509486
```

**Response 200:**
```json
{
  "type": "album",
  "id": "230509486",
  "data": {
    "id": "230509486",
    "title": "OK Computer",
    "artist": { "id": "11069", "name": "Radiohead" },
    "cover": "ab9b5cd8-9b1b-4d8e-b0b0-b2d5b63f5d5d",
    "release_date": "1997-05-21",
    "number_of_tracks": 10,
    "duration": 2554,
    "audio_quality": "MASTER",
    "audio_modes": ["MQA"],
    "upc": "075678245022",
    "label": { "id": "1234", "name": "EMI Records Ltd." }
  }
}
```

**Errores posibles:** 400 (`INVALID_URL`), 401, 404 (`NOT_FOUND`), 429, 451, 500.

> **Gap:** Endpoint nuevo. No existe en el backend actual.

---

### 1.3 GET /api/albums/:id

Detalle completo de un álbum, incluyendo todos sus tracks. Usado en el Estado D (Detail Panel).

**Path params:** `id` — ID numérico del álbum en Tidal.

**Response 200:**
```json
{
  "album": {
    "id": "230509486",
    "title": "OK Computer",
    "artist": { "id": "11069", "name": "Radiohead" },
    "cover": "ab9b5cd8-9b1b-4d8e-b0b0-b2d5b63f5d5d",
    "release_date": "1997-05-21",
    "number_of_tracks": 10,
    "duration": 2554,
    "audio_quality": "MASTER",
    "audio_modes": ["MQA"],
    "upc": "075678245022",
    "label": { "id": "1234", "name": "EMI Records Ltd." },
    "genre": "Alternative Rock"
  },
  "tracks": [
    {
      "id": "9812344",
      "title": "Airbag",
      "track_number": 1,
      "duration": 284,
      "audio_quality": "MASTER",
      "audio_modes": ["MQA"],
      "isrc": "GB-EMI-97-01234",
      "artist": { "id": "11069", "name": "Radiohead" }
    },
    {
      "id": "9812345",
      "title": "Paranoid Android",
      "track_number": 2,
      "duration": 383,
      "audio_quality": "MASTER",
      "audio_modes": ["MQA"],
      "isrc": "GB-EMI-97-01235",
      "artist": { "id": "11069", "name": "Radiohead" }
    }
  ]
}
```

**Errores posibles:** 401, 404, 429, 500.

> **Gap:** Endpoint nuevo. No existe en el backend actual.

---

### 1.4 POST /api/downloads

Encola una descarga de álbum o track individual.

**Request body:**
```json
{
  "album_id": "230509486",
  "quality": "MASTER"
}
```

O para track individual:
```json
{
  "track_id": "9812344",
  "quality": "FLAC"
}
```

Exactamente uno de `album_id` o `track_id` debe estar presente. Si ambos están presentes: 400.

| Campo | Tipo | Requerido | Valores |
|---|---|---|---|
| `album_id` | `string` | Condicional | ID de Tidal |
| `track_id` | `string` | Condicional | ID de Tidal |
| `quality` | `string` | Sí | `"MASTER"`, `"HIRES"`, `"HIGH"`, `"NORMAL"` |

**Response 200:**
```json
{
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "queued",
  "estimated_tracks": 10
}
```

**Response 409** (job duplicado — mismo `album_id` ya en cola o activo):
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "A download job for this album is already active",
    "http_status": 409,
    "retriable": false,
    "existing_job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

**Errores posibles:** 400, 401, 403, 409, 500.

> **Gap vs backend actual:** El endpoint actual es `POST /api/download/start` y toma `{ url }`. Necesita reemplazarse con el nuevo contrato que toma `album_id`/`track_id` + `quality`. El backend debe extraer el ID del álbum de la URL internamente o recibir el ID directamente.

---

### 1.5 PATCH /api/downloads/:jobId

Pausa, reanuda o reintenta un job.

**Path params:** `jobId` — UUID del job.

**Request body:**
```json
{ "action": "pause" }
```

| `action` | Estado requerido | Descripción |
|---|---|---|
| `"pause"` | `active` | Pausa la descarga |
| `"resume"` | `paused` | Reanuda la descarga |
| `"retry"` | `error` | Reinicia desde el último track fallido |

**Response 200:**
```json
{
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "paused"
}
```

**Response 422** (transición inválida):
```json
{
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Cannot pause a job with status 'completed'",
    "http_status": 422,
    "retriable": false
  }
}
```

**Errores posibles:** 400, 401, 404, 422, 500.

> **Gap:** Endpoint nuevo. No existe en el backend actual.

---

### 1.6 DELETE /api/downloads/:jobId

Cancela y elimina un job. Los archivos parciales descargados se conservan.

**Response 200:**
```json
{
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "cancelled": true,
  "tracks_saved": 5,
  "output_path": "/downloads/OK Computer"
}
```

`tracks_saved` es `0` si no se completó ningún track. `output_path` es `null` si no hay archivos.

**Errores posibles:** 401, 404, 500.

> **Gap:** Endpoint nuevo. No existe en el backend actual.

---

### 1.7 GET /api/session/status

Verifica el estado de la sesión activa de Tidal. Triggereado manualmente desde el modal G-recovery.

**Response 200 — sesión activa:**
```json
{
  "status": "active",
  "user": {
    "id": "u123456",
    "email": "picassoivan931@gmail.com",
    "country_code": "MX",
    "plan": "HIFI"
  },
  "expires_at": "2026-06-03T12:00:00Z"
}
```

**Response 200 — sesión expirada:**
```json
{
  "status": "expired",
  "user": null,
  "expires_at": null
}
```

> **Gap vs backend actual:** El endpoint actual es `GET /api/auth/status` y devuelve `{ authenticated: bool }`. Necesita ser extendido para incluir `user` y `expires_at`.

---

### 1.8 POST /api/session/device-auth

Inicia el flujo de Device Authorization de Tidal OAuth 2.0.

**Request body:** vacío `{}`

**Response 200:**
```json
{
  "device_code": "eyJhbGciOiJIUzI1NiJ9...",
  "user_code": "AB12-CD",
  "verification_uri": "tidal.com/activate",
  "verification_uri_complete": "tidal.com/activate?user_code=AB12-CD",
  "expires_in": 900,
  "interval": 5
}
```

| Campo | Descripción |
|---|---|
| `device_code` | Opaco, para polling. NO mostrar al usuario. |
| `user_code` | Código corto que el usuario ingresa en `verification_uri`. Mostrar en la UI. |
| `verification_uri` | URL base sin código. |
| `verification_uri_complete` | URL con código pre-completado. Abrir en navegador del sistema. |
| `expires_in` | Segundos hasta que el código expira (típicamente 900 = 15min). |
| `interval` | Segundos entre polls (mínimo 5). |

**Errores posibles:** 500.

> **Gap vs backend actual:** El endpoint actual es `POST /api/auth/device` y devuelve un subset de estos campos (sin `device_code`, `verification_uri`, `interval`). Necesita ser extendido.

---

### 1.9 GET /api/session/device-auth/:deviceCode

Polling de autorización durante el Device Auth flow. Llamar cada `interval` segundos.

**Response 200 — pendiente:**
```json
{ "status": "pending" }
```

**Response 200 — autorizado:**
```json
{
  "status": "authorized",
  "user": {
    "id": "u123456",
    "email": "picassoivan931@gmail.com",
    "country_code": "MX",
    "plan": "HIFI"
  },
  "expires_at": "2026-06-04T12:00:00Z"
}
```

**Response 400 — código expirado o denegado:**
```json
{
  "error": {
    "code": "DEVICE_AUTH_EXPIRED",
    "message": "The device code has expired. Please restart the authorization.",
    "http_status": 400,
    "retriable": false
  }
}
```

**Posibles `status`:** `"pending"`, `"authorized"`, `"denied"`, `"expired"`.

> **Gap:** Endpoint nuevo. El backend actual usa polling con `GET /api/auth/status` (sin device_code).

---

## 2. Domain Models

Interfaces TypeScript definitivas. Estas son la fuente de verdad. No duplicar en los stores ni en las queries.

```typescript
// ─── Primitivos de Tidal ───────────────────────────────────────────────────────

export type AudioQuality = 'MASTER' | 'HIRES' | 'HIGH' | 'NORMAL'
export type AudioMode = 'MQA' | 'SONY_360RA' | 'DOLBY_ATMOS' | 'STEREO'
export type TidalPlan = 'FREE' | 'HIFI' | 'HIFI_PLUS'

// ─── Entidades de dominio ─────────────────────────────────────────────────────

export interface Artist {
  readonly id: string
  readonly name: string
}

export interface Label {
  readonly id: string
  readonly name: string
}

export interface Album {
  readonly id: string
  readonly title: string
  readonly artist: Artist
  readonly coverUrl: string          // transformado desde cover UUID de Tidal
  readonly releaseYear: number       // derivado de releaseDate
  readonly releaseDate: string       // "1997-05-21"
  readonly numberOfTracks: number
  readonly durationSeconds: number
  readonly audioQuality: AudioQuality
  readonly audioModes: readonly AudioMode[]
  readonly upc: string
  readonly label: Label
  readonly genre: string | null
}

export interface Track {
  readonly id: string
  readonly title: string
  readonly trackNumber: number
  readonly durationSeconds: number
  readonly audioQuality: AudioQuality
  readonly audioModes: readonly AudioMode[]
  readonly isrc: string
  readonly artist: Artist
  readonly albumId: string            // requerido por player.store
  readonly albumTitle: string         // requerido por PlayerBar (wireframes-v2 §16)
  readonly coverUrl: string           // heredado del álbum
}

export interface Playlist {
  readonly id: string
  readonly title: string
  readonly description: string | null
  readonly numberOfTracks: number
  readonly creator: Artist
  readonly coverUrl: string | null
}

// ─── Downloads ────────────────────────────────────────────────────────────────

export type DownloadJobStatus =
  | 'queued'
  | 'active'
  | 'paused'
  | 'completed'
  | 'error'

export interface DownloadJobError {
  readonly code: number               // HTTP status code
  readonly message: string
  readonly retriable: boolean
}

export interface DownloadJob {
  readonly id: string                 // UUID, generado en frontend al encolar
  readonly backendJobId: string       // UUID del backend (del response de POST /downloads)
  readonly albumId: string
  readonly albumTitle: string
  readonly artistName: string
  readonly totalTracks: number
  readonly qualityOverride: AudioQuality | null  // null = usa settings.audioQuality
  // Campos mutables durante el progreso
  completedTracks: number
  currentTrackFilename: string | null
  progressPercent: number             // 0-100, nivel álbum
  speedMbps: number | null            // null si pausado
  etaSeconds: number | null           // null si pausado o desconocido
  status: DownloadJobStatus
  error: DownloadJobError | null
  startedAt: string | null            // ISO 8601
  completedAt: string | null          // ISO 8601
  outputPath: string | null           // ruta en disco al completar
}

export interface DownloadProgress {
  readonly jobId: string              // backendJobId
  readonly currentTrackFilename: string
  readonly completedTracks: number
  readonly totalTracks: number
  readonly progressPercent: number
  readonly speedMbps: number
  readonly etaSeconds: number
}

// ─── Auth / Session ──────────────────────────────────────────────────────────

export interface TidalUser {
  readonly id: string
  readonly email: string
  readonly countryCode: string
  readonly plan: TidalPlan
}

export interface TidalSession {
  readonly user: TidalUser
  readonly expiresAt: string          // ISO 8601
  // accessToken NO se expone al frontend — lo gestiona el backend vía cookie
}

export interface DeviceAuthCode {
  readonly deviceCode: string         // opaco, para polling
  readonly userCode: string           // "AB12-CD", mostrar al usuario
  readonly verificationUri: string    // "tidal.com/activate"
  readonly verificationUriComplete: string
  readonly expiresIn: number          // segundos
  readonly interval: number           // segundos entre polls
}

// ─── Búsqueda ─────────────────────────────────────────────────────────────────

export interface PaginatedList<T> {
  readonly items: readonly T[]
  readonly totalNumberOfItems: number
  readonly limit: number
  readonly offset: number
}

export interface SearchResults {
  readonly albums: PaginatedList<Album>
  readonly tracks: PaginatedList<Track>
  readonly playlists: PaginatedList<Playlist>
}

export interface ResolveUrlResult {
  readonly type: 'album' | 'track' | 'playlist'
  readonly id: string
  readonly data: Album | Track | Playlist
}

// ─── Errores ──────────────────────────────────────────────────────────────────

export type ApiErrorCode =
  | 'INVALID_URL'
  | 'NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'REGION_BLOCKED'
  | 'CONFLICT'
  | 'INVALID_TRANSITION'
  | 'DEVICE_AUTH_EXPIRED'
  | 'SERVER_ERROR'

export interface ApiError {
  readonly code: ApiErrorCode
  readonly message: string
  readonly httpStatus: number
  readonly retriable: boolean
  readonly existingJobId?: string     // solo en CONFLICT
}

// Type guard
export function isApiError(e: unknown): e is ApiError {
  return typeof e === 'object' && e !== null && 'code' in e && 'httpStatus' in e
}
```

---

### 2.1 Mappers DTO → Domain

```typescript
// shared/api/mappers.ts

const TIDAL_IMAGE_BASE = 'https://resources.tidal.com/images'

function coverIdToUrl(coverId: string, size = 480): string {
  return `${TIDAL_IMAGE_BASE}/${coverId.replace(/-/g, '/')}/${size}x${size}.jpg`
}

export function mapAlbumDTO(dto: AlbumDTO): Album {
  return {
    id: dto.id,
    title: dto.title,
    artist: dto.artist,
    coverUrl: dto.cover ? coverIdToUrl(dto.cover) : '',
    releaseYear: new Date(dto.release_date).getFullYear(),
    releaseDate: dto.release_date,
    numberOfTracks: dto.number_of_tracks,
    durationSeconds: dto.duration,
    audioQuality: dto.audio_quality,
    audioModes: dto.audio_modes ?? [],
    upc: dto.upc ?? '',
    label: dto.label ?? { id: '', name: '' },
    genre: dto.genre ?? null,
  }
}

export function mapTrackDTO(dto: TrackDTO, albumCtx: Pick<Album, 'id' | 'title' | 'coverUrl'>): Track {
  return {
    id: dto.id,
    title: dto.title,
    trackNumber: dto.track_number,
    durationSeconds: dto.duration,
    audioQuality: dto.audio_quality,
    audioModes: dto.audio_modes ?? [],
    isrc: dto.isrc ?? '',
    artist: dto.artist,
    albumId: albumCtx.id,
    albumTitle: albumCtx.title,
    coverUrl: albumCtx.coverUrl,
  }
}

export function mapWsMessageToProgress(msg: WsProgressPayload): DownloadProgress {
  return {
    jobId: msg.job_id,
    currentTrackFilename: msg.current_track_filename,
    completedTracks: msg.completed_tracks,
    totalTracks: msg.total_tracks,
    progressPercent: msg.progress_percent,
    speedMbps: msg.speed_mbps,
    etaSeconds: msg.eta_seconds,
  }
}
```

---

## 3. Query Architecture

### 3.1 Query Key Factory

```typescript
// shared/api/query-keys.ts

export const queryKeys = {
  search: {
    all: () => ['search'] as const,
    results: (query: string) => ['search', 'results', query] as const,
  },
  url: {
    all: () => ['url'] as const,
    resolve: (url: string) => ['url', 'resolve', url] as const,
  },
  album: {
    all: () => ['album'] as const,
    detail: (albumId: string) => ['album', 'detail', albumId] as const,
  },
  session: {
    all: () => ['session'] as const,
    status: () => ['session', 'status'] as const,
    deviceAuth: (deviceCode: string) => ['session', 'device-auth', deviceCode] as const,
  },
} as const

// Tipo helper para extraer el tipo de una query key
export type QueryKey = ReturnType<
  | typeof queryKeys.search.results
  | typeof queryKeys.url.resolve
  | typeof queryKeys.album.detail
  | typeof queryKeys.session.status
  | typeof queryKeys.session.deviceAuth
>
```

---

### 3.2 QueryClient config

```typescript
// shared/api/query-client.ts
import { QueryClient } from '@tanstack/react-query'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,             // override por query; default conservador
        gcTime: 5 * 60 * 1000,   // 5 min en caché tras desmonte
        retry: (failureCount, error) => {
          if (!isApiError(error)) return failureCount < 2
          // No reintentar errores de cliente
          if ([400, 401, 403, 404, 409, 451].includes(error.httpStatus)) return false
          // Reintentar hasta 2 veces en 429 y 5xx
          return failureCount < 2
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
        refetchOnWindowFocus: false,  // app de escritorio, no pestaña de browser
      },
      mutations: {
        retry: 0,
      },
    },
  })
}
```

---

### 3.3 Queries individuales con estrategia

**useSearchQuery**
```typescript
// features/search/model/search.queries.ts
export function useSearchQuery(query: string) {
  return useQuery({
    queryKey: queryKeys.search.results(query),
    queryFn: () => searchApi.search(query),
    enabled: query.trim().length >= 2,
    staleTime: 5 * 60 * 1000,     // 5 min — resultados de Tidal no cambian rápido
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,  // mantiene resultados anteriores durante carga
  })
}
// Invalidar: nunca — el usuario puede hacer nueva búsqueda.
// No invalidar al cambiar settings.audioQuality: la calidad no filtra resultados.
```

**useResolveUrlQuery**
```typescript
export function useResolveUrlQuery(url: string | null) {
  return useQuery({
    queryKey: queryKeys.url.resolve(url ?? ''),
    queryFn: () => searchApi.resolveUrl(url!),
    enabled: url !== null && isValidTidalUrl(url),
    staleTime: 15 * 60 * 1000,    // URLs de Tidal son estables
    gcTime: 20 * 60 * 1000,
    retry: 1,                      // si falla una vez probablemente es 404
  })
}
// Invalidar: nunca (las URLs de álbum no cambian).
```

**useAlbumDetailQuery**
```typescript
// features/album-detail/model/album.queries.ts
export function useAlbumDetailQuery(albumId: string | null) {
  return useQuery({
    queryKey: queryKeys.album.detail(albumId ?? ''),
    queryFn: () => albumApi.getDetail(albumId!),
    enabled: albumId !== null,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}
// Invalidar: queryClient.invalidateQueries(queryKeys.album.detail(id)) si el usuario
// edita metadata en una futura versión.
```

**useSessionStatusQuery**
```typescript
// features/auth/model/auth.queries.ts
export function useSessionStatusQuery() {
  return useQuery({
    queryKey: queryKeys.session.status(),
    queryFn: authApi.checkStatus,
    enabled: false,               // activar manualmente con .refetch()
    staleTime: 0,                 // siempre fresh
    gcTime: 0,
    retry: 0,
  })
}
// Invalidar: queryClient.invalidateQueries(queryKeys.session.all())
// después de Device Auth exitoso.
```

**useDeviceAuthPollingQuery**
```typescript
export function useDeviceAuthPollingQuery(deviceCode: string | null) {
  return useQuery({
    queryKey: queryKeys.session.deviceAuth(deviceCode ?? ''),
    queryFn: () => authApi.pollDeviceAuth(deviceCode!),
    enabled: deviceCode !== null,
    staleTime: 0,
    gcTime: 0,
    retry: false,                 // errores de polling son terminales
    refetchInterval: (query) => {
      // Detener polling si el status es terminal
      const data = query.state.data
      if (data?.status === 'authorized' || data?.status === 'expired' || data?.status === 'denied') {
        return false
      }
      return 5_000               // 5 segundos entre polls (según spec de Tidal)
    },
    refetchIntervalInBackground: false,
  })
}
```

---

### 3.4 Invalidation Rules

| Trigger | Queries a invalidar |
|---|---|
| Device Auth exitoso | `queryKeys.session.all()` |
| Sign out | `queryKeys.session.all()`, `queryKeys.search.all()`, `queryKeys.url.all()` |
| Sign in exitoso | `queryKeys.session.status()` |
| Error 401/403 en cualquier query | `queryKeys.session.status()` (verificar automáticamente) |

```typescript
// shared/api/client.ts — interceptor de errores de auth
async function handleApiError(error: ApiError) {
  if (error.httpStatus === 401 || (error.httpStatus === 403 && error.code === 'SESSION_EXPIRED')) {
    // Marcar sesión como expirada en auth.store
    useAuthStore.getState().setExpired()
    // No invalidar queries aquí — el usuario elige cuándo reconectar
  }
}
```

---

## 4. Zustand Store Specification

### Cuándo usar Zustand vs TanStack Query

| Estado | Herramienta | Razón |
|---|---|---|
| Cola de descargas (queue) | **Zustand** | Fuente de verdad es el WS, no el servidor |
| Progreso de descarga | **Zustand** | Actualización en tiempo real vía WS |
| Estado de sesión | **Zustand** (persist) | Sobrevive navegación entre páginas |
| Preferencias de usuario | **Zustand** (persist) | Local, no necesita server |
| Estado del player | **Zustand** | UI pura, sin server |
| Resultados de búsqueda | **TanStack Query** | Datos del servidor con cache |
| Detalle de álbum | **TanStack Query** | Datos del servidor con cache |
| Estado de sesión Tidal | **TanStack Query** (manual) | Verificación bajo demanda |

---

### 4.1 downloads.store.ts

```typescript
// features/downloads/model/downloads.store.ts
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import type { DownloadJob, AudioQuality } from '@/entities'

// ─── State ────────────────────────────────────────────────────────────────────

interface DownloadsState {
  queue: DownloadJob[]
  isPanelVisible: boolean
  isPanelExpanded: boolean
}

// ─── Actions ──────────────────────────────────────────────────────────────────

interface DownloadsActions {
  // Encolar un nuevo job. El campo `id` se genera en el frontend.
  // El campo `backendJobId` llega del response de POST /downloads.
  enqueue: (data: {
    backendJobId: string
    albumId: string
    albumTitle: string
    artistName: string
    totalTracks: number
    qualityOverride: AudioQuality | null
  }) => DownloadJob  // retorna el job creado para acceso inmediato

  // Actualizar cualquier campo mutable de un job por su backendJobId.
  // Usado por useDownloadSocket para updates de progreso.
  updateByBackendId: (backendJobId: string, updates: Partial<Pick<DownloadJob,
    | 'completedTracks'
    | 'currentTrackFilename'
    | 'progressPercent'
    | 'speedMbps'
    | 'etaSeconds'
    | 'status'
    | 'error'
    | 'startedAt'
    | 'completedAt'
    | 'outputPath'
  >>) => void

  // Eliminar un job por su id local (UUID frontend).
  removeJob: (id: string) => void

  // Eliminar todos los jobs con status 'completed'.
  clearCompleted: () => void

  // Control del panel
  setPanelVisible: (visible: boolean) => void
  setPanelExpanded: (expanded: boolean) => void
}

// ─── Transiciones de estado válidas ──────────────────────────────────────────
//
//  queued → active    (WS: job starts)
//  active → paused    (PATCH pause)
//  active → completed (WS: all tracks done)
//  active → error     (WS: download failed)
//  paused → active    (PATCH resume)
//  error  → active    (PATCH retry)
//  error  → removed   (DELETE / removeJob)
//  completed → removed (clearCompleted / removeJob after 10s)

const VALID_TRANSITIONS: Record<DownloadJob['status'], DownloadJob['status'][]> = {
  queued:    ['active'],
  active:    ['paused', 'completed', 'error'],
  paused:    ['active'],
  completed: [],
  error:     ['active'],
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDownloadsStore = create<DownloadsState & DownloadsActions>((set, get) => ({
  queue: [],
  isPanelVisible: false,
  isPanelExpanded: true,

  enqueue: (data) => {
    const newJob: DownloadJob = {
      id: crypto.randomUUID(),
      backendJobId: data.backendJobId,
      albumId: data.albumId,
      albumTitle: data.albumTitle,
      artistName: data.artistName,
      totalTracks: data.totalTracks,
      qualityOverride: data.qualityOverride,
      completedTracks: 0,
      currentTrackFilename: null,
      progressPercent: 0,
      speedMbps: null,
      etaSeconds: null,
      status: 'queued',
      error: null,
      startedAt: null,
      completedAt: null,
      outputPath: null,
    }
    set((s) => ({
      queue: [...s.queue, newJob],
      isPanelVisible: true,
    }))
    return newJob
  },

  updateByBackendId: (backendJobId, updates) => {
    set((s) => ({
      queue: s.queue.map((job) => {
        if (job.backendJobId !== backendJobId) return job
        // Validar transición de status
        if (updates.status && updates.status !== job.status) {
          const allowed = VALID_TRANSITIONS[job.status]
          if (!allowed.includes(updates.status)) {
            console.warn(`Invalid transition: ${job.status} → ${updates.status}`)
            return job
          }
        }
        return { ...job, ...updates }
      }),
    }))
  },

  removeJob: (id) =>
    set((s) => {
      const newQueue = s.queue.filter((j) => j.id !== id)
      return {
        queue: newQueue,
        isPanelVisible: newQueue.some((j) => j.status !== 'completed'),
      }
    }),

  clearCompleted: () =>
    set((s) => ({
      queue: s.queue.filter((j) => j.status !== 'completed'),
    })),

  setPanelVisible: (isPanelVisible) => set({ isPanelVisible }),
  setPanelExpanded: (isPanelExpanded) => set({ isPanelExpanded }),
}))

// ─── Selectors ────────────────────────────────────────────────────────────────
// Usar con useShallow para evitar re-renders por referencia de array.

export const useActiveJobs = () =>
  useDownloadsStore(useShallow((s) => s.queue.filter((j) => j.status === 'active')))

export const useQueuedJobs = () =>
  useDownloadsStore(useShallow((s) => s.queue.filter((j) => j.status === 'queued')))

export const useCompletedJobs = () =>
  useDownloadsStore(useShallow((s) => s.queue.filter((j) => j.status === 'completed')))

export const useErrorJobs = () =>
  useDownloadsStore(useShallow((s) => s.queue.filter((j) => j.status === 'error')))

// Glow eligibility: max 2 simultáneos, player tiene prioridad (wireframes-v2 §3)
export function selectGlowEligibleIds(
  queue: DownloadJob[],
  isPlayerActive: boolean
): Set<string> {
  const active = queue.filter((j) => j.status === 'active')
  const maxGlows = isPlayerActive ? 1 : 2
  return new Set(active.slice(0, maxGlows).map((j) => j.id))
}

export const useAverageProgress = () =>
  useDownloadsStore((s) => {
    const active = s.queue.filter((j) => j.status === 'active')
    if (active.length === 0) return 0
    return Math.round(active.reduce((sum, j) => sum + j.progressPercent, 0) / active.length)
  })

// isPanelVisible para la lógica condicional del Toast de error
export const useIsPanelVisible = () => useDownloadsStore((s) => s.isPanelVisible)
```

---

### 4.2 auth.store.ts

```typescript
// features/auth/model/auth.store.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { TidalUser, DeviceAuthCode } from '@/entities'

type SessionStatus = 'authenticated' | 'expired' | 'unauthenticated'

interface AuthState {
  status: SessionStatus
  user: TidalUser | null
  expiresAt: string | null          // ISO 8601
  deviceAuth: DeviceAuthCode | null
  isCheckingSession: boolean
  isRecoveryModalOpen: boolean
}

interface AuthActions {
  setAuthenticated: (user: TidalUser, expiresAt: string) => void
  setExpired: () => void
  clearSession: () => void
  setDeviceAuth: (code: DeviceAuthCode) => void
  clearDeviceAuth: () => void
  setCheckingSession: (v: boolean) => void
  openRecoveryModal: () => void
  closeRecoveryModal: () => void
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      status: 'unauthenticated',
      user: null,
      expiresAt: null,
      deviceAuth: null,
      isCheckingSession: false,
      isRecoveryModalOpen: false,

      setAuthenticated: (user, expiresAt) =>
        set({ status: 'authenticated', user, expiresAt }),

      setExpired: () =>
        set({ status: 'expired' }),

      clearSession: () =>
        set({
          status: 'unauthenticated',
          user: null,
          expiresAt: null,
          deviceAuth: null,
        }),

      setDeviceAuth: (deviceAuth) => set({ deviceAuth }),
      clearDeviceAuth: () => set({ deviceAuth: null }),
      setCheckingSession: (isCheckingSession) => set({ isCheckingSession }),
      openRecoveryModal: () => set({ isRecoveryModalOpen: true }),
      closeRecoveryModal: () =>
        set({ isRecoveryModalOpen: false, deviceAuth: null, isCheckingSession: false }),
    }),
    {
      name: 'music4all-auth',
      storage: createJSONStorage(() => localStorage),
      // NO persistir deviceAuth ni flags de UI
      partialize: (s) => ({
        status: s.status,
        user: s.user,
        expiresAt: s.expiresAt,
      }),
      // Al rehidratar: verificar si el token expiró
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (state.expiresAt && new Date(state.expiresAt) < new Date()) {
          state.status = 'expired'
        }
      },
    }
  )
)

// Selectors
export const selectIsAuthenticated = (s: AuthState) => s.status === 'authenticated'
export const selectUser = (s: AuthState) => s.user
export const selectIsRecoveryModalOpen = (s: AuthState) => s.isRecoveryModalOpen
export const selectDeviceAuth = (s: AuthState) => s.deviceAuth
```

---

### 4.3 settings.store.ts

```typescript
// features/settings/model/settings.store.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AudioQuality } from '@/entities'

type ViewMode = 'grid' | 'list'
type ResultsTab = 'albums' | 'tracks' | 'playlists'

interface SettingsState {
  audioQuality: AudioQuality
  downloadPath: string              // vacío = carpeta descargas del OS
  concurrentDownloads: number       // 1-5
  viewMode: ViewMode
  lastResultsTab: ResultsTab
}

interface SettingsActions {
  setAudioQuality: (q: AudioQuality) => void
  setDownloadPath: (p: string) => void
  setConcurrentDownloads: (n: number) => void
  setViewMode: (m: ViewMode) => void
  setLastResultsTab: (t: ResultsTab) => void
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      audioQuality: 'MASTER',
      downloadPath: '',
      concurrentDownloads: 2,
      viewMode: 'grid',
      lastResultsTab: 'albums',

      setAudioQuality: (audioQuality) => set({ audioQuality }),
      setDownloadPath: (downloadPath) => set({ downloadPath }),
      setConcurrentDownloads: (n) =>
        set({ concurrentDownloads: Math.max(1, Math.min(5, n)) }),
      setViewMode: (viewMode) => set({ viewMode }),
      setLastResultsTab: (lastResultsTab) => set({ lastResultsTab }),
    }),
    {
      name: 'music4all-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
```

---

### 4.4 player.store.ts

```typescript
// features/player/model/player.store.ts
import { create } from 'zustand'
import type { Track } from '@/entities'

interface PlayerState {
  currentTrack: Track | null
  isPlaying: boolean
  progressSeconds: number
  volume: number                    // 0-1
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
  setVolume: (v: number) => void
  setProgress: (seconds: number) => void
}

export const usePlayerStore = create<PlayerState & PlayerActions>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  progressSeconds: 0,
  volume: 0.8,
  queue: [],
  queueIndex: 0,

  play: (track, queue) => {
    const effectiveQueue = queue ?? [track]
    set({
      currentTrack: track,
      isPlaying: true,
      progressSeconds: 0,
      queue: effectiveQueue,
      queueIndex: effectiveQueue.findIndex((t) => t.id === track.id),
    })
  },

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),

  next: () => {
    const { queue, queueIndex } = get()
    const next = queueIndex + 1
    if (next < queue.length) {
      set({ currentTrack: queue[next], queueIndex: next, progressSeconds: 0 })
    }
  },

  previous: () => {
    const { queue, queueIndex, progressSeconds } = get()
    if (progressSeconds > 3) { set({ progressSeconds: 0 }); return }
    const prev = queueIndex - 1
    if (prev >= 0) set({ currentTrack: queue[prev], queueIndex: prev, progressSeconds: 0 })
  },

  seek: (progressSeconds) => set({ progressSeconds }),
  setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)) }),
  setProgress: (progressSeconds) => set({ progressSeconds }),
}))

// Selectors
export const selectIsPlayerActive = (s: PlayerState) => s.isPlaying
export const selectCurrentTrack = (s: PlayerState) => s.currentTrack
```

---

## 5. WebSocket Protocol

### 5.1 Conexión

**URL:** `ws://localhost:8000/ws/downloads`  
*(En producción vía Next.js rewrite: `ws://backend:8000/ws/downloads`)*

La conexión es **única y compartida** para todos los jobs activos de la sesión. No existe un WS por job.

> **Gap crítico vs implementación actual:** El código actual usa `ws://localhost:8000/ws/progress/{jobId}` — una conexión por job. El backend debe migrarse a una única conexión que multiplexe todos los jobs.

### 5.2 Autenticación

La cookie `session_id` se envía automáticamente por el browser en el handshake WS si `credentials: 'include'` está configurado. El backend verifica la cookie antes de aceptar la conexión.

### 5.3 Mensajes entrantes (servidor → cliente)

Todos los mensajes tienen el campo `type` como discriminante.

**Tipo: `progress`**
```json
{
  "type": "progress",
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "payload": {
    "current_track_filename": "Airbag.flac",
    "completed_tracks": 3,
    "total_tracks": 10,
    "progress_percent": 32,
    "speed_mbps": 3.2,
    "eta_seconds": 105
  }
}
```

**Tipo: `job_started`**
```json
{
  "type": "job_started",
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "payload": {
    "started_at": "2026-06-02T10:00:00Z"
  }
}
```

**Tipo: `job_completed`**
```json
{
  "type": "job_completed",
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "payload": {
    "output_path": "/downloads/OK Computer",
    "completed_at": "2026-06-02T10:08:43Z",
    "total_tracks": 10
  }
}
```

**Tipo: `job_error`**
```json
{
  "type": "job_error",
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "payload": {
    "code": 403,
    "message": "Tidal returned 403: session may have expired",
    "retriable": true,
    "completed_tracks": 5
  }
}
```

**Tipo: `job_paused`** / **`job_resumed`**
```json
{
  "type": "job_paused",
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "payload": {}
}
```

**Tipo: `pong`** (heartbeat response)
```json
{ "type": "pong", "timestamp": 1748822400000 }
```

### 5.4 Mensajes salientes (cliente → servidor)

**Heartbeat ping** (cada 30 segundos):
```json
{ "type": "ping", "timestamp": 1748822400000 }
```

El backend responde con `pong`. Si no hay `pong` en 60 segundos, el cliente cierra la conexión y reconecta.

### 5.5 Reconnect Strategy

```typescript
// shared/api/ws-client.ts
export class DownloadWebSocketClient {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private readonly maxAttempts = 10
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private lastPongTime = Date.now()

  constructor(
    private readonly url: string,
    private readonly onMessage: (msg: WsIncomingMessage) => void,
    private readonly onStatusChange: (connected: boolean) => void
  ) {}

  connect(): void {
    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this.onStatusChange(true)
      this.startHeartbeat()
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as WsIncomingMessage
        if (msg.type === 'pong') {
          this.lastPongTime = Date.now()
          return
        }
        this.onMessage(msg)
      } catch {
        // ignorar mensajes malformados
      }
    }

    this.ws.onclose = () => {
      this.stopHeartbeat()
      this.onStatusChange(false)
      this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      // onclose siempre se llama después de onerror
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
      // Si no hay pong en 60s, forzar reconexión
      if (Date.now() - this.lastPongTime > 60_000) {
        this.ws.close()
        return
      }
      this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
    }, 30_000)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxAttempts) return
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (cap)
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000)
    this.reconnectAttempts++
    setTimeout(() => this.connect(), delay)
  }

  disconnect(): void {
    this.stopHeartbeat()
    this.ws?.close()
    this.ws = null
  }
}
```

### 5.6 useDownloadSocket — integración con Zustand

```typescript
// features/downloads/hooks/useDownloadSocket.ts
'use client'

import { useEffect, useRef } from 'react'
import { DownloadWebSocketClient } from '@/shared/api/ws-client'
import { useDownloadsStore } from '../model/downloads.store'
import { WS_URL } from '@/shared/config/ws.config'

export function useDownloadSocket(): void {
  const client = useRef<DownloadWebSocketClient | null>(null)
  const { updateByBackendId, setPanelVisible } = useDownloadsStore()

  useEffect(() => {
    client.current = new DownloadWebSocketClient(
      WS_URL,
      (msg) => {
        switch (msg.type) {
          case 'progress':
            updateByBackendId(msg.job_id, {
              currentTrackFilename: msg.payload.current_track_filename,
              completedTracks: msg.payload.completed_tracks,
              progressPercent: msg.payload.progress_percent,
              speedMbps: msg.payload.speed_mbps,
              etaSeconds: msg.payload.eta_seconds,
              status: 'active',
            })
            break
          case 'job_started':
            updateByBackendId(msg.job_id, {
              status: 'active',
              startedAt: msg.payload.started_at,
            })
            break
          case 'job_completed':
            updateByBackendId(msg.job_id, {
              status: 'completed',
              completedAt: msg.payload.completed_at,
              outputPath: msg.payload.output_path,
              progressPercent: 100,
              speedMbps: null,
              etaSeconds: null,
            })
            break
          case 'job_error':
            updateByBackendId(msg.job_id, {
              status: 'error',
              error: {
                code: msg.payload.code,
                message: msg.payload.message,
                retriable: msg.payload.retriable,
              },
              speedMbps: null,
              etaSeconds: null,
            })
            break
          case 'job_paused':
            updateByBackendId(msg.job_id, { status: 'paused', speedMbps: null, etaSeconds: null })
            break
          case 'job_resumed':
            updateByBackendId(msg.job_id, { status: 'active' })
            break
        }
      },
      (connected) => {
        // En el store de downloads, panelVisible ya lo controla enqueue/removeJob.
        // Solo usar isConnected para mostrar "Reconnecting..." en el panel header.
        useDownloadsStore.setState({ wsConnected: connected })
      }
    )

    client.current.connect()
    return () => client.current?.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps — singleton durante la sesión
}
```

Montar `useDownloadSocket()` **una sola vez** en `(app)/layout.tsx` dentro de un componente `DownloadSocketProvider`. No montar en cada página ni en cada componente del panel.

---

## 6. Component Implementation Checklist

Formato: `Component | Props | Hooks | Store | Queries | Events | Dependencies`

---

### Shell & Layout

| Component | Props | Hooks | Store | Queries | Events emitidos | Deps |
|---|---|---|---|---|---|---|
| `AppLayout` | `children` | — | — | — | — | `Sidebar`, `DownloadPanel`, `PlayerBar`, `SessionRecoveryModal` |
| `Sidebar` | — | `usePathname` | `auth`, `downloads` | — | — | `NavItem`, `TidalConnectionStatus` |
| `NavItem` | `href`, `label`, `icon`, `badge?` | — | — | — | — | `Link` |
| `TidalConnectionStatus` | — | — | `auth` | — | `onReconnect` → abre RecoveryModal | — |
| `DownloadPanel` | — | `useDownloadsStore` | `downloads` | — | — | `DownloadPanelCollapsed`, `DownloadPanelExpanded` |
| `DownloadPanelCollapsed` | `activeCount`, `avgProgress`, `queuedCount` | — | — | — | `onExpand` | `ProgressBar` |
| `DownloadPanelExpanded` | `jobs`, `wsConnected` | — | `downloads` | — | `onCollapse`, `onClearCompleted` | `DownloadJobItem` |
| `DownloadJobItem` | `job`, `glowActive` | — | — | — | `onPause`, `onResume`, `onCancel`, `onRetry`, `onRemove`, `onCheckSession`, `onShowInExplorer` | `JobProgress`, `JobActions`, `Popover` |
| `JobProgress` | `job` | — | — | — | — | `ProgressBar`, `Badge` |
| `JobActions` | `job` | `useState` (popover open) | — | — | `onPause`, `onResume`, `onCancel`, `onRetry`, `onRemove` | `Popover`, `Button` |
| `PlayerBar` | — | — | `player`, `downloads` | — | — | `PlayerArtwork`, `PlayerTrackInfo`, `PlayerControls`, `PlayerProgressSlider`, `PlayerVolume` |
| `PlayerProgressSlider` | — | `useRef`, `useState` | `player` | — | `onSeek` | — |
| `SessionRecoveryModal` | `isOpen`, `jobIdToRetry?` | — | `auth` | `useSessionStatusQuery`, `useDeviceAuthPollingQuery` | `onClose`, `onRenewed` | `Modal`, `SessionCheckingPhase`, `SessionActivePhase`, `DeviceAuthPhase` |
| `DeviceAuthPhase` | `deviceAuth` | `useState` (countdown) | `auth` | `useDeviceAuthPollingQuery` | `onAuthorized`, `onExpired` | — |

---

### Dashboard Page

| Component | Props | Hooks | Store | Queries | Events emitidos | Deps |
|---|---|---|---|---|---|---|
| `DashboardClient` | — | `useState` (searchState, query, urlInput, selectedAlbumId, isDetailOpen) | `settings`, `downloads`, `auth` | — | — | `SearchInput`, `DashboardContent` |
| `SearchInput` | `onSearch`, `onUrlDetected`, `onClear`, `isLoading?` | `useUrlDetection`, `useKeyboardShortcut('mod+k')` | — | — | — | `Input`, `Skeleton` |
| `EmptyState` | — | — | — | — | — | — |
| `UrlPreviewSkeleton` | — | — | — | — | — | `Skeleton` |
| `UrlPreview` | `albumId`, `onDownload`, `onDownloadTrack`, `onClear` | — | `settings` | `useAlbumDetailQuery` | — | `AlbumPreviewCard`, `DownloadCTA`, `TrackPreviewList` |
| `DownloadCTA` | `availableQualities`, `defaultQuality`, `onDownload` | `useState` (selectedQuality) | — | — | — | `Button`, `QualitySelector` |
| `TrackPreviewList` | `tracks`, `defaultQuality`, `onDownloadTrack` | — | — | — | — | `TrackPreviewRow` |
| `TrackPreviewRow` | `track`, `defaultQuality`, `onDownload` | `useState` (isHovered) | — | — | — | `Button`, `Badge` |
| `SearchResults` | `query`, `onOpenDetail`, `onDownload`, `onDownloadTrack` | — | `settings` | `useSearchQuery` | — | `ResultsToolbar`, `AlbumGrid`, `AlbumList`, `ZeroResults` |
| `ResultsToolbar` | `counts`, `activeTab`, `viewMode` | — | `settings` | — | `onTabChange`, `onViewModeChange` | `Tabs`, `ViewToggle` |
| `AlbumGrid` | `albums`, `onOpenDetail`, `onDownload` | — | — | — | — | `AlbumCard` |
| `AlbumCard` | `album`, `onOpenDetail`, `onDownload` | `useState` (isHovered) | `settings` | — | — | `AlbumCardOverlay`, `AlbumCardContextMenu` |
| `AlbumCardOverlay` | `album`, `defaultQuality`, `onDownload`, `onOpenDetail` | `useState` (popoverOpen) | — | — | — | `Button`, `QualitySelector` |
| `AlbumCardContextMenu` | `album`, `onDownload`, `onOpenDetail` | — | — | — | — | `Popover` |
| `AlbumList` | `albums`, `onOpenDetail`, `onDownload` | — | — | — | — | `AlbumListRow` |
| `AlbumListRow` | `album`, `onOpenDetail`, `onDownload` | `useState` (isHovered) | `settings` | — | — | `Badge`, `Button` |
| `ZeroResults` | `query` | — | — | — | — | — |
| `AlbumDetailPanel` | `albumId`, `isOpen`, `onClose`, `onDownloadAlbum`, `onDownloadTrack` | `useRef` (triggerRef) | `settings` | `useAlbumDetailQuery` | — | `AlbumDetailCTA`, `TrackList`, `AlbumMetadataSection` |
| `AlbumDetailCTA` | `availableQualities`, `defaultQuality`, `trackCount`, `onDownload` | `useState` (selectedQuality) | — | — | — | `Button`, `QualitySelector` |
| `TrackList` | `tracks`, `defaultQuality`, `onDownload` | — | — | — | — | `TrackRow` |
| `TrackRow` | `track`, `defaultQuality`, `onDownload` | `useState` (isHovered) | — | — | — | `Badge`, `Button` |
| `AlbumMetadataSection` | `album` | — | — | — | — | — |
| `QualitySelector` | `available`, `selected`, `onSelect`, `size?` | `useState` (open) | — | — | — | `Popover` |

---

## 7. Testing Specification

### 7.1 Stack

```
Unit / Integration:  Vitest + React Testing Library + @testing-library/user-event
E2E:                 Playwright
Mock server:         msw (Mock Service Worker) v2
WS mocking:          msw con ws handler
Test DB:             Ninguna (el frontend no tiene DB propia)
```

Configuración en `vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      thresholds: { lines: 80, functions: 80, branches: 75 },
    },
  },
})
```

---

### 7.2 Unit Tests

**Entidades y mappers** (`entities/**/*.test.ts`):

| Test | Descripción |
|---|---|
| `mapAlbumDTO → Album` | Cover ID correcto a URL, releaseYear derivado |
| `mapTrackDTO → Track` | albumTitle y albumId presentes |
| `coverIdToUrl(coverId, 480)` | URL bien formada |
| `isApiError(unknown)` | Type guard correcto |
| `selectGlowEligibleIds` | max 2 con player activo → max 1 |

**Zustand stores** (`features/**/model/*.test.ts`):

| Store | Test |
|---|---|
| `downloads.store` | `enqueue` añade job en status 'queued' |
| `downloads.store` | `updateByBackendId` rechaza transición inválida |
| `downloads.store` | `removeJob` oculta panel cuando queue vacío |
| `downloads.store` | `clearCompleted` solo elimina status 'completed' |
| `auth.store` | `onRehydrateStorage` marca `expired` si `expiresAt` pasado |
| `auth.store` | `setExpired` preserva `user` y `expiresAt` |
| `settings.store` | `setConcurrentDownloads` clampea a 1-5 |
| `player.store` | `previous` busca desde inicio si `progressSeconds > 3` |

**Shared utilities** (`shared/lib/*.test.ts`):

| Función | Tests |
|---|---|
| `formatDuration(2554)` | `"42:34"` |
| `formatDuration(65)` | `"1:05"` |
| `formatEta(105)` | `"1:45"` |
| `formatSpeed(3.2)` | `"3.2 MB/s"` |
| `isValidTidalUrl('https://tidal.com/browse/album/230509486')` | `true` |
| `isValidTidalUrl('https://spotify.com/album/x')` | `false` |
| `isValidTidalUrl('not a url')` | `false` |
| `getTidalUrlType('https://tidal.com/browse/album/...')` | `'album'` |

---

### 7.3 Integration Tests (componentes con MSW)

Estos tests usan `renderWithProviders()` — un helper que envuelve con `QueryClient` + Zustand stores frescos.

```typescript
// src/test/utils.tsx
export function renderWithProviders(ui: React.ReactElement, options?: RenderOptions) {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
    options
  )
}
```

**SearchInput** (`features/search/ui/SearchInput.test.tsx`):
- Al pegar una URL de Tidal → llama `onUrlDetected` con la URL
- Al escribir texto + Enter → llama `onSearch` con el query
- Al presionar `⌘K` → el input recibe foco
- Con `isLoading=true` → input en `readonly`

**UrlPreviewSkeleton** (`features/search/ui/UrlPreviewSkeleton.test.tsx`):
- Renderiza sin errores
- El botón "Download" tiene `disabled`

**UrlPreview** (con MSW):
- Muestra datos correctos del álbum del mock
- Badge "MQA" — no más de 8 caracteres
- Click en fila de track en hover → llama `onDownloadTrack` con `track` y `quality`
- QualitySelector: cambiar calidad → el botón Download refleja la nueva calidad
- Click "Download" con quality override → `onDownload` recibe el override, no el default

**AlbumCard** (`features/search/ui/AlbumCard.test.tsx`):
- Click en artwork (fuera del botón) → llama `onOpenDetail`
- Click en botón "↓ Download" (dentro del overlay) → llama `onDownload`, NO llama `onOpenDetail`
- El botón Download tiene `aria-label` con nombre del álbum y calidad

**AlbumDetailPanel** (con MSW):
- Abre con slide-in al `isOpen=true`
- Cierra con `Escape`
- Al cerrar, el foco regresa al `triggerRef`
- Badge de calidad max 8 chars
- TrackRow en hover → botón ↓ visible y funcional

**DownloadJobItem**:
- Job status `active`: muestra ⏸ y ✕
- Job status `paused`: muestra ▶ y ✕
- Job status `error`: muestra ↻ Retry, ✕ Check Session, Remove
- Job status `completed`: muestra `outputPath` y botón ↗
- Click ✕ → CancelPopover abre, foco en "Keep Downloading"
- Click "Cancel" en CancelPopover → llama `onCancel`

**SessionRecoveryModal**:
- Fase 1: spinner visible, no hay botón de acción
- Mock `GET /api/session/status` → `{ status: 'active' }` → renderiza `SessionActivePhase`
- Mock `GET /api/session/status` → `{ status: 'expired' }` → renderiza `DeviceAuthPhase`
- DeviceAuthPhase: código "AB12-CD" visible, botón ↗ Open abre el URL correcto
- DeviceAuthPhase: countdown decrementa cada segundo
- Mock polling → `{ status: 'authorized' }` → renderiza Fase 3

---

### 7.4 E2E Tests (Playwright)

**Setup:**
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

Los E2E corren contra el servidor Next.js con MSW activado en modo browser (service worker en dev). No usan el backend real.

**Flujo 1: Búsqueda → Grid → Detail Panel → Download**
```
1. Navegar a /dashboard
2. Input tiene foco automáticamente
3. Escribir "Radiohead OK Computer" + Enter
4. Grid muestra 5 cards de álbumes
5. Click en artwork de "OK Computer"
6. Detail Panel abre con slide-in (250ms)
7. Badge de calidad visible: "MQA"
8. Click "↓ Download Album (10 tracks)" → QualitySelector visible
9. Confirmar con calidad actual → Download inicia
10. Download Panel aparece (fixed, no layout shift verificado)
11. Grid no se mueve (verificar `getBoundingClientRect` antes/después)
12. Escape → Detail Panel cierra
13. Foco regresa a la AlbumCard
```

**Flujo 2: URL paste → B-loading → B preview → Download**
```
1. Pegar "https://tidal.com/browse/album/230509486"
2. B-loading aparece (skeletons visibles, botón disabled)
3. Después de mock response: B preview completa
4. Label "URL detected — Album" en teal
5. Track 06 en hover → botón ↓ visible
6. Click ↓ en track → job añadido, panel aparece
7. Layout no se mueve
```

**Flujo 3: Error de descarga → G-recovery → Device Auth**
```
1. Iniciar descarga → mock WS envía job_error con code 403
2. Job muestra estado error en panel
3. Toast NO aparece (panel visible)
4. Click "Check Session"
5. Modal abre → Fase 1 (spinner)
6. Mock GET /api/session/status → expired
7. Fase 2b aparece: código "AB12-CD", countdown visible
8. Mock poll → authorized
9. Fase 3: "Session renewed"
10. Job automáticamente retoma (mock PATCH /downloads/:id → status: active)
11. Modal cierra
```

**Flujo 4: Keyboard navigation**
```
1. ⌘K → foco en SearchInput desde cualquier página
2. Escribir + Enter → resultados
3. Tab → primera AlbumCard en foco
4. Enter → Detail Panel abre
5. Tab dentro del panel → TrackRow, botones
6. Escape → panel cierra, foco en card
7. D sobre card en foco → download inicia
```

**Criterios de aceptación por fase:**

| Fase | Criterio mínimo E2E |
|---|---|
| Fase 3 (Search) | Flujos 1 y 2 pasan |
| Fase 4 (Detail) | Flujo 1 completo con Detail Panel |
| Fase 5 (Downloads) | Layout no se mueve (test de BoundingClientRect) |
| Fase 6 (OAuth) | Flujo 3 completo |
| Fase 7 (Polish) | Flujo 4 completo, zero `axe` violations |

---

## 8. Migration Plan

### 8.1 Análisis del codebase actual

```
frontend/src/
├── app/
│   ├── dashboard/page.tsx   ← GOD COMPONENT (401 líneas, todo mezclado)
│   ├── history/page.tsx     ← Funcional, usar como referencia
│   ├── login/page.tsx       ← Funcional, reutilizable con cambios menores
│   ├── layout.tsx           ← Mínimo, necesita Sidebar + DownloadPanel + PlayerBar
│   ├── page.tsx             ← Redirect a /dashboard, OK
│   └── globals.css          ← Cyberpunk CSS vars, reemplazar totalmente
├── components/
│   ├── DownloadButton.tsx   ← Reemplazar con Button de shared/ui
│   ├── NeonTitle.tsx        ← DELETE (reemplazado por BrandLogo)
│   ├── ProgressBar.tsx      ← Reutilizar lógica, reemplazar estilos
│   └── VinylCard.tsx        ← DELETE (reemplazado por AlbumCard)
├── hooks/
│   └── useWebSocket.ts      ← BASE para ws-client.ts (reutilizar lógica de reconexión)
├── lib/
│   ├── api.ts               ← DELETE (descomponer en shared/api/client.ts + domain APIs)
│   └── theme.ts             ← DELETE (reemplazado por CSS custom properties en globals.css)
├── providers/
│   └── QueryProvider.tsx    ← REUTILIZAR, mover a app/layout.tsx
└── store/
    └── useAppStore.ts       ← DELETE (reemplazado por 4 stores separados)
```

---

### 8.2 Matriz de decisiones por archivo

| Archivo actual | Acción | Archivo destino | Notas |
|---|---|---|---|
| `app/dashboard/page.tsx` | **REESCRIBIR** | `app/(app)/dashboard/page.tsx` | Vaciar y usar DashboardClient |
| `app/history/page.tsx` | **MOVER** | `app/(app)/history/page.tsx` | Ajustar imports |
| `app/login/page.tsx` | **MOVER** | `app/(auth)/login/page.tsx` | Ajustar con nuevo auth.store |
| `app/layout.tsx` | **MODIFICAR** | `app/(app)/layout.tsx` + `app/layout.tsx` | Separar root y grupo |
| `app/globals.css` | **REEMPLAZAR** | `app/globals.css` | Nueva paleta design-system |
| `app/page.tsx` | **MANTENER** | `app/page.tsx` | `redirect('/dashboard')` |
| `components/DownloadButton.tsx` | **DELETE** | — | `shared/ui/Button.tsx` |
| `components/NeonTitle.tsx` | **DELETE** | — | `widgets/sidebar/BrandLogo.tsx` |
| `components/ProgressBar.tsx` | **REEMPLAZAR** | `shared/ui/ProgressBar.tsx` | Nueva interfaz con variantes |
| `components/VinylCard.tsx` | **DELETE** | — | `features/search/ui/AlbumCard.tsx` |
| `hooks/useWebSocket.ts` | **EVOLUCIONAR** | `shared/api/ws-client.ts` | Añadir heartbeat + reconnect |
| `lib/api.ts` | **DELETE** | Múltiples `*/api/*.ts` | Separar por dominio |
| `lib/theme.ts` | **DELETE** | `globals.css` | CSS custom properties |
| `providers/QueryProvider.tsx` | **MOVER** | `app/layout.tsx` (inline) | Sin archivo separado |
| `store/useAppStore.ts` | **DELETE** | 4 archivos de store | Separar responsabilidades |

---

### 8.3 Gap de backend (crítico — coordinar con backend team)

| Endpoint actual | Estado | Acción requerida |
|---|---|---|
| `GET /api/auth/status` → `{authenticated: bool}` | Insuficiente | Extender para incluir `user`, `status`, `expires_at` |
| `POST /api/auth/device` | Incompleto | Añadir `device_code`, `interval`, `verification_uri` |
| Polling via `GET /api/auth/status` | No funciona | Añadir `GET /api/session/device-auth/:deviceCode` |
| `GET /api/metadata/search` → lista plana | Incompleto | Añadir `GET /api/search` con respuesta tipada por entidad |
| Sin endpoint de detalle | Faltante | Añadir `GET /api/albums/:id` |
| Sin endpoint de resolve URL | Faltante | Añadir `GET /api/resolve?url=` |
| `POST /api/download/start` toma URL | Incompleto | Añadir `POST /api/downloads` que toma `album_id`/`track_id` + `quality` |
| Sin pause/resume | Faltante | Añadir `PATCH /api/downloads/:jobId` |
| Sin cancel | Faltante | Añadir `DELETE /api/downloads/:jobId` |
| WS por job `/ws/progress/:jobId` | Incompleto | Migrar a `/ws/downloads` (single connection, multiplex) |

**Estrategia de compatibilidad durante la migración:**  
El frontend puede funcionar con endpoints de adaptador temporales. Por ejemplo, `POST /api/downloads` puede internamente llamar a `POST /api/download/start` con la URL resuelta. El frontend no debe conocer esta adaptación.

---

### 8.4 Riesgos técnicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Backend no listo a tiempo | Alta | Crítico | MSW para todos los endpoints. Frontend puede desarrollarse en paralelo. |
| Migración WS rompe downloads en progreso | Media | Alto | Fase 5 se implementa cuando el nuevo endpoint WS está disponible. |
| CSS vars conflictan con Tailwind | Baja | Medio | Usar prefijo `--m4a-` para todos los custom properties. |
| `useShallow` mal aplicado → re-renders | Media | Medio | Tests de performance con React DevTools Profiler en Fase 7. |
| Cookie `session_id` no llega al WS en dev | Media | Alto | Configurar `next.config.mjs` rewrites para WS. Testear temprano. |
| `crypto.randomUUID()` no disponible en HTTP (no-HTTPS) | Baja | Bajo | Usar polyfill o `Math.random()` en dev. |

### 8.5 Deuda técnica existente que NO se lleva a la nueva versión

- `axios` → no instalar en el nuevo proyecto. Usar `fetch` nativo.
- Import `window.open` dentro del store action → nunca en stores. Solo en componentes o handlers.
- Race condition en auth check (`useEffect` + `router.replace`) → resuelto con middleware de Next.js.
- WS URL hardcodeada → usar `shared/config/ws.config.ts`.
- Queries sin `staleTime` → configuración explícita por query.

---

## 9. Developer Task Breakdown

### Epic E1 — Design System

| ID | Tipo | Título | Tamaño | Deps |
|---|---|---|---|---|
| E1-S1 | Story | Configurar Tailwind con design tokens | M | — |
| E1-T1 | Task | CSS custom properties en globals.css (colores, z-index) | S | — |
| E1-T2 | Task | tailwind.config.ts extendido con tokens | S | E1-T1 |
| E1-S2 | Story | Implementar componentes base shared/ui | L | E1-S1 |
| E1-T3 | Task | Button (variantes: primary, secondary, ghost, ghost-danger) | S | E1-S1 |
| E1-T4 | Task | Input (size lg, readonly state, trailing slot) | S | E1-S1 |
| E1-T5 | Task | Badge (variantes: format, quality, error; límite 8 chars) | XS | E1-S1 |
| E1-T6 | Task | ProgressBar (variantes: download, error, success; sizes sm/md) | S | E1-S1 |
| E1-T7 | Task | Skeleton (shimmer animation + reduced-motion) | S | E1-S1 |
| E1-T8 | Task | Popover (Radix Popover + estilos del DS) | M | E1-S1 |
| E1-T9 | Task | Modal (Radix Dialog + focus trap) | M | E1-S1 |
| E1-T10 | Task | Toast (Radix Toast + variantes error/success) | S | E1-S1 |
| E1-T11 | Task | Tabs (Radix Tabs + underline variant) | S | E1-S1 |
| E1-T12 | Task | Tooltip (Radix Tooltip + estilos) | XS | E1-S1 |
| E1-T13 | Task | shared/lib/format.ts (formatDuration, formatEta, formatSpeed) | XS | — |
| E1-T14 | Task | shared/lib/cn.ts (clsx + tailwind-merge) | XS | — |
| E1-T15 | Task | Unit tests para todos los shared/ui (RTL) | M | E1-S2 |

---

### Epic E2 — Layout Shell

| ID | Tipo | Título | Tamaño | Deps |
|---|---|---|---|---|
| E2-S1 | Story | App shell con Sidebar + PlayerBar + DownloadPanel (placeholder) | L | E1 |
| E2-T1 | Task | auth.store.ts con persist middleware | S | — |
| E2-T2 | Task | settings.store.ts con persist | S | — |
| E2-T3 | Task | player.store.ts | S | — |
| E2-T4 | Task | Sidebar (5 nav items, TidalConnectionStatus, badge de jobs) | M | E2-T1 |
| E2-T5 | Task | PlayerBar (estados: vacío, reproduciendo, pausado) | M | E2-T3 |
| E2-T6 | Task | app/(app)/layout.tsx (monta shell, aplica grupos de ruta) | S | E2-T4, E2-T5 |
| E2-T7 | Task | app/layout.tsx root con Providers | S | — |
| E2-T8 | Task | Middleware de Next.js para auth guard | S | E2-T1 |
| E2-T9 | Task | MSW setup en dev (handlers vacíos listos para Fase 3) | S | — |

---

### Epic E3 — Search

| ID | Tipo | Título | Tamaño | Deps |
|---|---|---|---|---|
| E3-S1 | Story | SearchInput con detección de URL | M | E1, E2 |
| E3-T1 | Task | shared/hooks/useUrlDetection.ts | S | — |
| E3-T2 | Task | shared/hooks/useKeyboardShortcuts.ts (⌘K global) | S | — |
| E3-T3 | Task | SearchInput component | M | E3-T1, E3-T2 |
| E3-S2 | Story | Estado B-loading y B preview | L | E3-S1 |
| E3-T4 | Task | entities/album/album.types.ts + mapAlbumDTO | S | — |
| E3-T5 | Task | entities/track/track.types.ts + mapTrackDTO | S | — |
| E3-T6 | Task | shared/api/client.ts (fetch wrapper + error parsing) | M | — |
| E3-T7 | Task | features/search/api/search.api.ts | S | E3-T6 |
| E3-T8 | Task | MSW handlers: GET /api/resolve, GET /api/search | S | — |
| E3-T9 | Task | useResolveUrlQuery | S | E3-T7 |
| E3-T10 | Task | UrlPreviewSkeleton | S | E1 |
| E3-T11 | Task | UrlPreview + TrackPreviewList + TrackPreviewRow | M | E3-T9, E3-T10 |
| E3-T12 | Task | DownloadCTA + QualitySelector | M | E1 |
| E3-S3 | Story | Estado C (Grid + List + ZeroResults) | L | E3-S2 |
| E3-T13 | Task | useSearchQuery | S | E3-T7 |
| E3-T14 | Task | AlbumGrid + AlbumCard + AlbumCardOverlay | L | E3-T13 |
| E3-T15 | Task | AlbumCardContextMenu (Popover ⋯) | S | E1-T8 |
| E3-T16 | Task | AlbumList + AlbumListRow | M | E3-T14 |
| E3-T17 | Task | ZeroResults (osciloscopio) + ResultsToolbar | S | E1 |
| E3-T18 | Task | EmptyState (ilustración + autoFocus) | S | E1 |
| E3-T19 | Task | DashboardClient (máquina de estados de búsqueda) | M | E3-T11, E3-T14 |
| E3-T20 | Task | Integration tests: SearchInput, UrlPreview, AlbumCard | M | — |

---

### Epic E4 — Album Detail Panel

| ID | Tipo | Título | Tamaño | Deps |
|---|---|---|---|---|
| E4-S1 | Story | Drawer lateral con detalle de álbum | L | E3 |
| E4-T1 | Task | features/album-detail/api/album.api.ts | S | E3-T6 |
| E4-T2 | Task | MSW handler: GET /api/albums/:id | S | — |
| E4-T3 | Task | useAlbumDetailQuery | S | E4-T1 |
| E4-T4 | Task | AlbumDetailPanel (drawer, focus trap, Escape) | L | E4-T3 |
| E4-T5 | Task | AlbumDetailCTA (QualitySelector inline) | S | E3-T12 |
| E4-T6 | Task | TrackList + TrackRow (hover download, consistente con B) | M | — |
| E4-T7 | Task | AlbumMetadataSection (UPC, ISRC, Label, ✎ reservado) | S | — |
| E4-T8 | Task | Integration tests: AlbumDetailPanel | M | — |

---

### Epic E5 — Downloads

| ID | Tipo | Título | Tamaño | Deps |
|---|---|---|---|---|
| E5-S1 | Story | Download Panel fijo + store + WebSocket | XL | E4 |
| E5-T1 | Task | downloads.store.ts (transiciones validadas) | M | — |
| E5-T2 | Task | shared/api/ws-client.ts (heartbeat + reconnect exponencial) | M | — |
| E5-T3 | Task | useDownloadSocket (singleton en layout) | M | E5-T2, E5-T1 |
| E5-T4 | Task | MSW WS handler para /ws/downloads | M | — |
| E5-T5 | Task | DownloadPanel (wrapper fixed, z-panel:150, bottom:80px) | S | — |
| E5-T6 | Task | DownloadPanelCollapsed (1 línea, stats) | S | E5-T1 |
| E5-T7 | Task | DownloadPanelExpanded (lista de jobs, header, clear) | M | E5-T1 |
| E5-T8 | Task | DownloadJobItem (prioridad glow, jerarquía invertida) | M | E5-T1 |
| E5-T9 | Task | JobProgress (ProgressBar + métricas) | S | E1-T6 |
| E5-T10 | Task | JobActions (Pause/Resume/Cancel con Popover) | M | E1-T8 |
| E5-T11 | Task | Integrar download flow en DashboardClient | M | E5-T3 |
| E5-T12 | Task | MSW handlers: POST /api/downloads, PATCH, DELETE | S | — |
| E5-T13 | Task | Integration tests: DownloadJobItem (todos los estados) | M | — |
| E5-T14 | Task | E2E: verificar no-layout-shift (BoundingClientRect) | M | — |

---

### Epic E6 — OAuth Recovery

| ID | Tipo | Título | Tamaño | Deps |
|---|---|---|---|---|
| E6-S1 | Story | Modal de recuperación de sesión (3 fases) | L | E5 |
| E6-T1 | Task | entities/session/session.types.ts | S | — |
| E6-T2 | Task | features/auth/api/auth.api.ts (status + device-auth + poll) | M | E3-T6 |
| E6-T3 | Task | MSW handlers: GET /api/session/status, POST /api/session/device-auth, GET poll | S | — |
| E6-T4 | Task | useSessionStatusQuery + useDeviceAuthPollingQuery | M | E6-T2 |
| E6-T5 | Task | SessionCheckingPhase | S | — |
| E6-T6 | Task | SessionActivePhase | S | — |
| E6-T7 | Task | DeviceAuthPhase (código, countdown, polling) | M | E6-T4 |
| E6-T8 | Task | SessionRecoveryModal (orquesta las 3 fases, focus trap) | M | E6-T5, E6-T6, E6-T7 |
| E6-T9 | Task | Conectar modal a DownloadJobItem "Check Session" | S | E6-T8, E5-T8 |
| E6-T10 | Task | Toast condicional (solo si panel no visible) | S | E5-T5 |
| E6-T11 | Task | Integration tests: SessionRecoveryModal (3 fases) | M | — |
| E6-T12 | Task | E2E: Flujo completo error 403 → Device Auth → renovado | L | — |

---

### Epic E7 — Polish

| ID | Tipo | Título | Tamaño | Deps |
|---|---|---|---|---|
| E7-S1 | Story | Animaciones con Framer Motion | M | E6 |
| E7-T1 | Task | Transiciones Detail Panel (slide-in 250ms) | S | — |
| E7-T2 | Task | Download Panel (slide-up, colapso) | S | — |
| E7-T3 | Task | Session Modal (scale + fade) | S | — |
| E7-T4 | Task | Empty state (fade + translateY) | S | — |
| E7-T5 | Task | prefers-reduced-motion en todos los efectos | S | — |
| E7-S2 | Story | Accessibility audit | M | E6 |
| E7-T6 | Task | ARIA roles y labels (tabla §7.1 de impl-spec) | M | — |
| E7-T7 | Task | Focus trap en Modal y Popover | S | — |
| E7-T8 | Task | Live regions para descargas | S | — |
| E7-T9 | Task | E2E: keyboard navigation completo (Flujo 4) | M | — |
| E7-T10 | Task | Axe accessibility audit (zero violations en páginas core) | M | — |
| E7-S3 | Story | Responsive (768–1023px) | M | E6 |
| E7-T11 | Task | Sidebar colapsado a 64px (iconos) | S | — |
| E7-T12 | Task | AlbumDetailPanel → bottom sheet en 768–1023px | M | — |
| E7-T13 | Task | PlayerBar comprimido (solo play + slider) | S | — |
| E7-S4 | Story | Error boundary + not-found | S | E6 |
| E7-T14 | Task | app/(app)/error.tsx | XS | — |
| E7-T15 | Task | app/not-found.tsx | XS | — |

---

### Resumen de estimaciones

| Epic | Tamaño total estimado |
|---|---|
| E1 — Design System | ~5 días |
| E2 — Layout Shell | ~3 días |
| E3 — Search | ~6 días |
| E4 — Album Detail | ~4 días |
| E5 — Downloads | ~6 días |
| E6 — OAuth Recovery | ~4 días |
| E7 — Polish | ~4 días |
| **Total** | **~32 días / ~6.5 semanas** |

---

## 10. Definition of Done

Toda feature o componente se considera **Done** cuando cumple **todas** las siguientes condiciones sin excepción.

---

### UX
- [ ] Comportamiento coincide exactamente con `docs/wireframes-dashboard-v2.md`
- [ ] Ninguna decisión de UX fue tomada durante la implementación (todo está en los docs)
- [ ] Click targets son exactos: artwork abre Detail Panel, botón Download inicia descarga
- [ ] Download Panel no causa layout shift verificado con `getBoundingClientRect()`
- [ ] Glow rule: nunca más de 2 elementos con glow simultáneo (verificado con React DevTools)

### Performance
- [ ] Lighthouse Performance ≥ 90 en la ruta `/dashboard`
- [ ] LCP ≤ 2.5s (el input de búsqueda es el elemento principal)
- [ ] No hay re-renders innecesarios (verificado con Profiler en `useShallow` + selectors)
- [ ] Imágenes de artwork: `loading="lazy"` en cards del grid
- [ ] QueryClient tiene `staleTime` configurado por query (no el default de 0)

### Accessibility
- [ ] Zero violations en `axe-core` en `/dashboard` (todas las páginas core)
- [ ] Todos los botones tienen `aria-label` descriptivo (no solo ícono)
- [ ] Focus management correcto al abrir/cerrar Detail Panel y SessionRecoveryModal
- [ ] Focus trap activo en Modal y Popover (Tab no escapa)
- [ ] `aria-live` region presente para actualizaciones de downloads
- [ ] `prefers-reduced-motion` respetado (skeletons sin shimmer, transiciones a 100ms)
- [ ] Contraste mínimo WCAG AA para todo texto funcional (no para `text-disabled`)

### Security
- [ ] `accessToken` de Tidal NO se almacena en `localStorage` (solo en cookie httpOnly)
- [ ] `sessionStorage` no se usa para datos sensibles
- [ ] No hay secrets o tokens en el código fuente del frontend
- [ ] Input de búsqueda no ejecuta código (no hay `dangerouslySetInnerHTML` con input del usuario)
- [ ] URLs externas abren con `target="_blank" rel="noopener noreferrer"`

### State Management
- [ ] Todo estado del servidor está en TanStack Query (no en Zustand)
- [ ] Ningún store tiene llamadas HTTP directas (solo en los archivos `*/api/*.ts`)
- [ ] `downloads.store.ts` rechaza transiciones de estado inválidas (test verificado)
- [ ] `auth.store.ts` al rehidratar verifica `expiresAt` y marca `expired` si pasado
- [ ] `settings.store.ts` persiste en localStorage y se restaura correctamente

### Networking
- [ ] HTTP client maneja errores con `ApiError` tipado (no `any`)
- [ ] Todas las queries tienen `retry` configurado (no el default global)
- [ ] `placeholderData: keepPreviousData` en `useSearchQuery`
- [ ] WebSocket reconecta con backoff exponencial (max 30s entre intentos)
- [ ] Heartbeat WS activo cada 30s; reconexión si no hay pong en 60s
- [ ] MSW activado en modo dev para todos los endpoints

### Error Handling
- [ ] Cada error del Error Handling Matrix (§9) tiene UI definida e implementada
- [ ] Error 403 → `auth.store.setExpired()` + modal disponible
- [ ] Error 429 → Toast con countdown de `Retry-After` header
- [ ] WS desconectado → panel muestra "Reconnecting..." (no spinner infinito sin contexto)
- [ ] `app/(app)/error.tsx` captura errores de rendering no manejados
- [ ] Toast de error solo cuando `isPanelVisible === false`

### Responsive
- [ ] 1440px: layout de referencia correcto
- [ ] 1280px: grid se reduce a 4-5 columnas, panel lateral a 360px
- [ ] 1024px: layout correcto, sidebar 240px
- [ ] 768px: sidebar colapsado a 64px, detail panel = bottom sheet
- [ ] < 768px: mensaje "optimized for desktop" visible

### Testing
- [ ] Unit tests en Vitest para todos los stores y mappers (coverage ≥ 80%)
- [ ] Integration tests con RTL para todos los componentes del checklist §6
- [ ] E2E con Playwright para los 4 flujos definidos en §7.4
- [ ] Tests pasan en CI sin flakiness (cero fails en 3 runs consecutivos)

### Build Pipeline
- [ ] `pnpm build` pasa sin errores ni warnings de TypeScript
- [ ] `pnpm lint` (ESLint) pasa con zero warnings
- [ ] `pnpm type-check` (tsc --noEmit) pasa
- [ ] Bundle size analizado con `@next/bundle-analyzer`: vendor chunk < 500KB
- [ ] No hay imports de `node_modules` no listados en `package.json`
- [ ] Husky pre-commit hook ejecuta lint + type-check antes de cada commit

---

*Music 4 All — Technical Specification v1.0 · Junio 2026*  
*Este documento cierra el ciclo de diseño → especificación → implementación.*  
*No hay decisiones abiertas. El equipo puede comenzar la implementación por Epic E1 inmediatamente.*
