'use client'

import { useMutation } from '@tanstack/react-query'

import { downloadsApi } from '../api/downloads.api'
import type { AudioQuality } from '@/entities'

interface StartParams {
  albumId?: string
  trackId?: string
  quality: AudioQuality
}

export function useStartDownloadMutation() {
  return useMutation({
    mutationFn: (params: StartParams) => downloadsApi.start(params),
  })
}

export function useUpdateDownloadMutation() {
  return useMutation({
    mutationFn: ({
      jobId,
      action,
    }: {
      jobId: string
      action: 'pause' | 'resume' | 'retry'
    }) => downloadsApi.update(jobId, action),
  })
}

export function useCancelDownloadMutation() {
  return useMutation({
    mutationFn: (jobId: string) => downloadsApi.cancel(jobId),
  })
}

/**
 * Retries a job that is in 'error' state.
 * Primarily used by useDownloadRecovery (Phase 6H) after session renewal.
 *
 * PATCH /downloads/{jobId} { action: 'retry' }
 */
export function useRetryDownloadMutation() {
  return useMutation({
    mutationFn: (jobId: string) => downloadsApi.retry(jobId),
  })
}
