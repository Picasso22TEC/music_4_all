'use client'

import { useEffect } from 'react'

// Widget layer — can import from both features per FSD hierarchy (widgets > features)
import { openSessionRecovery, selectJobIdToRetry, useAuthStore } from '@/features/auth'
import { useDownloadsStore, useRetryDownloadMutation } from '@/features/downloads'

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Bridges DownloadPanel ↔ SessionRecoveryModal for auth error recovery (Phase 6H).
 *
 * Two-step integration:
 *
 * Step 1 — Auth error from WS → open recovery modal:
 *   useDownloadSocket detects 401/403 → sets pendingAuthRecovery in downloads.store
 *   This hook watches pendingAuthRecovery → clears it → calls openSessionRecovery(jobId)
 *
 * Step 2 — Recovery complete → auto-retry the failed download:
 *   SessionRecoveryModal closes after successful auth
 *   jobIdToRetry is preserved in auth.store (closeRecoveryModal does NOT clear it)
 *   This hook detects !isRecoveryModalOpen + jobIdToRetry + authenticated
 *   → calls useRetryDownloadMutation
 *   → on settled: calls clearJobIdToRetry() to prevent duplicate retries
 */
export function useDownloadRecovery(): { isRetrying: boolean } {
  const pendingAuthRecovery = useDownloadsStore((s) => s.pendingAuthRecovery)
  const jobIdToRetry        = useAuthStore(selectJobIdToRetry)
  const status              = useAuthStore((s) => s.status)
  const isRecoveryModalOpen = useAuthStore((s) => s.isRecoveryModalOpen)

  const { mutate: retryJob, isPending: isRetrying } = useRetryDownloadMutation()

  // ── Step 1: Auth error arrived via WS → open SessionRecoveryModal ────────
  useEffect(() => {
    if (!pendingAuthRecovery) return

    // Clear immediately so the effect doesn't re-trigger
    useDownloadsStore.getState().setPendingAuthRecovery(null)

    // Open the recovery modal with the failing job stored for Step 2
    openSessionRecovery(pendingAuthRecovery)
  }, [pendingAuthRecovery])

  // ── Step 2: Recovery complete → retry the download ───────────────────────
  useEffect(() => {
    if (isRecoveryModalOpen) return         // modal still open
    if (!jobIdToRetry)       return         // nothing to retry
    if (status !== 'authenticated') return  // auth not recovered

    retryJob(jobIdToRetry, {
      onSettled: () => {
        // Always clear — success or failure — to prevent repeated retries
        useAuthStore.getState().clearJobIdToRetry()
      },
    })
  }, [isRecoveryModalOpen, jobIdToRetry, status, retryJob])

  return { isRetrying }
}
