'use client'

import { useShallow } from 'zustand/react/shallow'

import { selectGlowEligibleIds, useDownloadsStore } from './downloads.store'

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Categorizes the download queue into status buckets (active, paused, queued,
 * completed, error) and derives the visible-job ordering + glow eligibility.
 *
 * Shared by DownloadPanel (widget, collapsed overlay) and the /downloads page
 * (full view) so both stay in sync without duplicating the filter logic.
 */
export function useDownloadQueue() {
  const queue          = useDownloadsStore(useShallow((s) => s.queue))
  const wsConnected    = useDownloadsStore((s) => s.wsConnected)
  const clearCompleted = useDownloadsStore((s) => s.clearCompleted)
  const removeJob      = useDownloadsStore((s) => s.removeJob)

  const activeJobs    = queue.filter((j) => j.status === 'active')
  const pausedJobs    = queue.filter((j) => j.status === 'paused')
  const queuedJobs    = queue.filter((j) => j.status === 'queued')
  const completedJobs = queue.filter((j) => j.status === 'completed')
  const errorJobs     = queue.filter((j) => j.status === 'error')

  // Visible jobs: active + paused (top), then queued, then error, then completed
  const visibleJobs = [...activeJobs, ...pausedJobs, ...queuedJobs, ...errorJobs, ...completedJobs]

  // Glow rule — player not yet integrated; assume player inactive
  const glowEligible = selectGlowEligibleIds(queue, false)

  return {
    queue,
    wsConnected,
    clearCompleted,
    removeJob,
    activeJobs,
    pausedJobs,
    queuedJobs,
    completedJobs,
    errorJobs,
    visibleJobs,
    glowEligible,
    activeCount:    activeJobs.length + pausedJobs.length,
    queuedCount:    queuedJobs.length,
    completedCount: completedJobs.length,
    errorCount:     errorJobs.length,
  }
}
