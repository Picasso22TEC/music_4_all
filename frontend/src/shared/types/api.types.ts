import type { AudioQuality, AudioMode } from '@/entities/album'

// ─── DTO types — raw API response shapes (snake_case) ────────────────────────
// These are the shapes sent by the FastAPI backend before domain mapping.

export interface ArtistDTO {
  id: string
  name: string
}

export interface LabelDTO {
  id: string
  name: string
}

export interface AlbumDTO {
  id: string
  title: string
  artist: ArtistDTO
  cover: string
  release_date: string
  number_of_tracks: number
  duration: number
  audio_quality: AudioQuality
  audio_modes?: AudioMode[]
  upc?: string
  label?: LabelDTO
  genre?: string
  type?: string | null
}

export interface TrackDTO {
  id: string
  title: string
  track_number: number
  duration: number
  audio_quality: AudioQuality
  audio_modes?: AudioMode[]
  isrc?: string
  artist: ArtistDTO
  album?: { id: string; title: string; cover?: string }
}

export interface WsProgressPayload {
  job_id: string
  current_track_filename: string
  completed_tracks: number
  total_tracks: number
  progress_percent: number
  speed_mbps: number
  eta_seconds: number
}

export interface AlbumDetailResponseDTO {
  album: AlbumDTO
  tracks: TrackDTO[]
}

export interface ArtistDetailDTO {
  id: string
  name: string
  picture: string | null
}

export interface ArtistDetailResponseDTO {
  artist: ArtistDetailDTO
  top_tracks: TrackDTO[]
  albums: AlbumDTO[]
  ep_singles: AlbumDTO[]
  other: AlbumDTO[]
  similar: ArtistSearchDTO[]
}

export interface ResolveUrlResponseDTO {
  type: 'album' | 'track' | 'playlist'
  id: string
  data: AlbumDTO | TrackDTO
}

export interface ArtistSearchDTO {
  id: string
  name: string
  picture?: string | null
}

export interface TopHitDTO {
  type: 'artist' | 'album' | 'track' | 'playlist'
  artist?: ArtistSearchDTO | null
  album?: AlbumDTO | null
  track?: TrackDTO | null
  playlist?: Record<string, unknown> | null
}

export interface SearchResponseDTO {
  top_hit?: TopHitDTO | null
  artists: {
    items: ArtistSearchDTO[]
    total_number_of_items: number
    limit: number
    offset: number
  }
  albums: {
    items: AlbumDTO[]
    total_number_of_items: number
    limit: number
    offset: number
  }
  tracks: {
    items: TrackDTO[]
    total_number_of_items: number
    limit: number
    offset: number
  }
  playlists: {
    items: unknown[]
    total_number_of_items: number
    limit: number
    offset: number
  }
}

export interface StartDownloadResponseDTO {
  job_id: string
  status: string
  estimated_tracks: number
}

export interface SessionStatusResponseDTO {
  status: 'active' | 'expired'
  user: {
    id: string
    email: string
    country_code: string
    plan: string
  } | null
  expires_at: string | null
}

export interface DeviceAuthResponseDTO {
  device_code: string
  user_code: string
  verification_uri: string
  verification_uri_complete: string
  expires_in: number
  interval: number
}

export interface DeviceAuthPollResponseDTO {
  status: 'pending' | 'authorized' | 'denied' | 'expired'
  user?: {
    id: string
    email: string
    country_code: string
    plan: string
  }
  expires_at?: string
}

// ── PKCE: segunda sesión Tidal para 16-bit LOSSLESS (Fase 5) ──────────────────
export interface PkceStartResponseDTO {
  /** URL de login web de Tidal que el usuario abre para autorizar la Hi-Fi. */
  login_url: string
}

export interface PkceStatusResponseDTO {
  connected: boolean
}

// ── Panel de sesiones activas del usuario (backend Fase 1, UI Fase 7) ─────────
export interface SessionInfoDTO {
  sid: string
  created_at: number
  last_seen: number
  ip: string
  user_agent: string
  current: boolean
}

export interface SessionListResponseDTO {
  sessions: SessionInfoDTO[]
}
