'use client'

import { useCancelDownloadMutation, useUpdateDownloadMutation } from './downloads.queries'

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Pause/resume/cancel handlers for a download job, backed by the v2
 * `/downloads` mutations. Shared by DownloadPanel (widget) and the
 * /downloads page so the PATCH/DELETE wiring isn't duplicated.
 */
export function useDownloadActions() {
  const updateMutation = useUpdateDownloadMutation()
  const cancelMutation  = useCancelDownloadMutation()

  function pause(backendJobId: string) {
    updateMutation.mutate({ jobId: backendJobId, action: 'pause' })
  }

  function resume(backendJobId: string) {
    updateMutation.mutate({ jobId: backendJobId, action: 'resume' })
  }

  function cancel(backendJobId: string) {
    cancelMutation.mutate(backendJobId)
  }

  return { pause, resume, cancel }
}
