import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useTrackDownload } from '@/features/downloads/model/useTrackDownload'
import { useDownloadsStore } from '@/features/downloads/model/downloads.store'
import type { Track } from '@/entities'

// El hook decide QUÉ se encola; la petición y el toast son de otras capas.
const mockMutate = vi.fn()
vi.mock('@/features/downloads/model/downloads.queries', () => ({
  useStartDownloadMutation: () => ({ mutate: mockMutate }),
  useUpdateDownloadMutation: () => ({ mutate: vi.fn() }),
  useCancelDownloadMutation: () => ({ mutate: vi.fn() }),
  useRetryDownloadMutation: () => ({ mutate: vi.fn() }),
}))

const mockToast = vi.fn()
vi.mock('@/shared/ui', () => ({
  useToast: () => ({ toast: mockToast, dismiss: vi.fn(), dismissAll: vi.fn() }),
}))

const track = {
  id: 'track-1',
  title: 'Creep',
  trackNumber: 3,
  durationSeconds: 240,
  audioQuality: 'MASTER',
  audioModes: [],
  isrc: 'GB0000000001',
  artist: { id: 'artist-1', name: 'Thom Yorke' },
  albumId: 'album-9',
  albumTitle: 'The Bends',
  coverUrl: 'https://example.test/cover.jpg',
} as unknown as Track

function downloadWith(options?: { onError?: (e: unknown) => void }) {
  const { result } = renderHook(() => useTrackDownload('HIRES'))
  result.current(track, options)
  return mockMutate.mock.calls[0]
}

beforeEach(() => {
  mockMutate.mockReset()
  mockToast.mockReset()
  useDownloadsStore.setState({ queue: [] })
})

describe('useTrackDownload', () => {
  it('asks the backend for the single track, not its album', () => {
    const [variables] = downloadWith()
    expect(variables).toEqual({ trackId: 'track-1', quality: 'HIRES' })
  })

  it('queues the song under its own title, keeping the album for the artwork', () => {
    const [, options] = downloadWith()
    options.onSuccess({ jobId: 'job-1', status: 'queued', estimatedTracks: 1 })

    const [job] = useDownloadsStore.getState().queue
    expect(job.albumTitle).toBe('Creep') // el nombre de la canción, no el del álbum
    expect(job.albumId).toBe('album-9')
    expect(job.artistName).toBe('Thom Yorke')
    expect(job.totalTracks).toBe(1)
    expect(job.qualityOverride).toBe('HIRES')
  })

  it('reports a rejection through the toast by default', () => {
    const [, options] = downloadWith()
    options.onError({ code: 'QUOTA_EXCEEDED', message: 'Límite diario alcanzado', httpStatus: 429 })
    expect(mockToast).toHaveBeenCalledTimes(1)
  })

  it('lets a batch handle its own errors, so N rejections do not mean N toasts', () => {
    const onError = vi.fn()
    const [, options] = downloadWith({ onError })
    options.onError(new Error('nope'))

    expect(onError).toHaveBeenCalledTimes(1)
    expect(mockToast).not.toHaveBeenCalled()
  })
})
