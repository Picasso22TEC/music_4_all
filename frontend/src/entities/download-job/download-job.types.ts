import type { AudioQuality } from '@/entities/album'

export type DownloadJobStatus =
  | 'queued'
  | 'active'
  | 'paused'
  | 'completed'
  | 'error'

export interface DownloadJobError {
  readonly code: number
  readonly message: string
  readonly retriable: boolean
}

export interface DownloadJob {
  readonly id: string
  readonly backendJobId: string
  readonly albumId: string
  readonly albumTitle: string
  readonly artistName: string
  readonly totalTracks: number
  readonly qualityOverride: AudioQuality | null
  completedTracks: number
  currentTrackFilename: string | null
  progressPercent: number
  speedMbps: number | null
  etaSeconds: number | null
  status: DownloadJobStatus
  error: DownloadJobError | null
  startedAt: string | null
  completedAt: string | null
  outputPath: string | null
}

export interface DownloadProgress {
  readonly jobId: string
  readonly currentTrackFilename: string
  readonly completedTracks: number
  readonly totalTracks: number
  readonly progressPercent: number
  readonly speedMbps: number
  readonly etaSeconds: number
}
