'use client'

import { useShallow } from 'zustand/react/shallow'

import {
  selectGlowEligibleIds,
  useAverageProgress,
  useDownloadsStore,
  useIsPanelVisible,
} from '@/features/downloads'

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Aggregates download-panel state from downloads.store.
 * Single read point for DownloadPanel components.
 */
export function useDownloadPanel() {
  const isPanelVisible  = useIsPanelVisible()
  const isPanelExpanded = useDownloadsStore((s) => s.isPanelExpanded)
  const wsConnected     = useDownloadsStore((s) => s.wsConnected)
  const setPanelExpanded = useDownloadsStore((s) => s.setPanelExpanded)
  const clearCompleted  = useDownloadsStore((s) => s.clearCompleted)
  const avgProgress     = useAverageProgress()

  const queue = useDownloadsStore(useShallow((s) => s.queue))

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
    isPanelVisible,
    isPanelExpanded,
    wsConnected,
    setPanelExpanded,
    clearCompleted,
    avgProgress,
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
