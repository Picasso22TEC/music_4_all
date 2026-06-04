import type { Album, AudioQuality, AudioMode } from '@/entities/album'
import type { Track } from '@/entities/track'
import type { DownloadProgress } from '@/entities/download-job'
import type { AlbumDTO, TrackDTO, WsProgressPayload } from '@/shared/types/api.types'

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
    audioQuality: dto.audio_quality as AudioQuality,
    audioModes: (dto.audio_modes ?? []) as AudioMode[],
    upc: dto.upc ?? '',
    label: dto.label ?? { id: '', name: '' },
    genre: dto.genre ?? null,
  }
}

export function mapTrackDTO(
  dto: TrackDTO,
  albumCtx: Pick<Album, 'id' | 'title' | 'coverUrl'>
): Track {
  return {
    id: dto.id,
    title: dto.title,
    trackNumber: dto.track_number,
    durationSeconds: dto.duration,
    audioQuality: dto.audio_quality as AudioQuality,
    audioModes: (dto.audio_modes ?? []) as AudioMode[],
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
