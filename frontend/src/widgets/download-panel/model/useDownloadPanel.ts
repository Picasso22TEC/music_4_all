'use client'

import {
  useAverageProgress,
  useDownloadQueue,
  useDownloadsStore,
  useIsPanelVisible,
} from '@/features/downloads'

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Aggregates download-panel state: panel visibility/expansion from
 * downloads.store, plus the shared queue categorization from
 * useDownloadQueue (also used by the /downloads page).
 * Single read point for DownloadPanel components.
 */
export function useDownloadPanel() {
  const isPanelVisible   = useIsPanelVisible()
  const isPanelExpanded  = useDownloadsStore((s) => s.isPanelExpanded)
  const setPanelExpanded = useDownloadsStore((s) => s.setPanelExpanded)
  const avgProgress      = useAverageProgress()

  const {
    wsConnected,
    clearCompleted,
    visibleJobs,
    glowEligible,
    activeCount,
    queuedCount,
    completedCount,
  } = useDownloadQueue()

  return {
    isPanelVisible,
    isPanelExpanded,
    wsConnected,
    setPanelExpanded,
    clearCompleted,
    avgProgress,
    visibleJobs,
    glowEligible,
    activeCount,
    queuedCount,
    completedCount,
  }
}
