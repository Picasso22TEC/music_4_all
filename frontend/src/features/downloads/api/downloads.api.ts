import client from '@/shared/api/client'
import type { AudioQuality } from '@/entities'

interface StartDownloadParams {
  albumId?: string
  trackId?: string
  quality: AudioQuality
}

interface StartDownloadResult {
  jobId: string
  status: string
  estimatedTracks: number
}

interface UpdateDownloadResult {
  jobId: string
  status: string
}

interface CancelDownloadResult {
  jobId: string
  cancelled: boolean
  tracksSaved: number
  outputPath: string | null
}

export const downloadsApi = {
  async start(params: StartDownloadParams): Promise<StartDownloadResult> {
    const body: Record<string, string> = { quality: params.quality }
    if (params.albumId) body.album_id = params.albumId
    if (params.trackId) body.track_id = params.trackId

    const { data } = await client.post<{
      job_id: string
      status: string
      estimated_tracks: number
    }>('/downloads', body)

    return {
      jobId: data.job_id,
      status: data.status,
      estimatedTracks: data.estimated_tracks,
    }
  },

  async update(
    jobId: string,
    action: 'pause' | 'resume' | 'retry'
  ): Promise<UpdateDownloadResult> {
    const { data } = await client.patch<{ job_id: string; status: string }>(
      `/downloads/${jobId}`,
      { action }
    )
    return { jobId: data.job_id, status: data.status }
  },

  /** Convenience wrapper for PATCH /downloads/{jobId} { action: 'retry' } */
  async retry(jobId: string): Promise<UpdateDownloadResult> {
    return downloadsApi.update(jobId, 'retry')
  },

  async cancel(jobId: string): Promise<CancelDownloadResult> {
    const { data } = await client.delete<{
      job_id: string
      cancelled: boolean
      tracks_saved: number
      output_path: string | null
    }>(`/downloads/${jobId}`)

    return {
      jobId: data.job_id,
      cancelled: data.cancelled,
      tracksSaved: data.tracks_saved,
      outputPath: data.output_path,
    }
  },
}
