'use client'

import { AnimatePresence, motion } from 'framer-motion'

import { cn } from '@/shared/lib/cn'
import { useDownloadActions, useDownloadsStore, useDownloadSocket } from '@/features/downloads'
import { openSessionRecovery } from '@/features/auth'

import { useDownloadPanel } from '../model/useDownloadPanel'
import { useDownloadRecovery } from '../model/useDownloadRecovery'
import { DownloadJobItem } from './DownloadJobItem'

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Fixed-position download panel (wireframes §2, §11, §12).
 *
 * Position: fixed above PlayerBar (bottom-20 = 80px = h-player).
 * z-panel: 150 — between z-raised:10 and z-sticky:200.
 *
 * Also mounts useDownloadSocket() as a singleton — this component is always
 * present in (app)/layout.tsx so the WS connection persists for the session.
 */
export function DownloadPanel() {
  // Mount unified WS socket once (singleton for the authenticated session)
  useDownloadSocket()

  // Phase 6H: bridge downloads ↔ SessionRecoveryModal
  const { isRetrying } = useDownloadRecovery()

  const {
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
  } = useDownloadPanel()

  const { pause, resume, cancel } = useDownloadActions()
  const removeJob = useDownloadsStore((s) => s.removeJob)

  /** Manual "Check Session" from DownloadJobItem error state */
  function handleCheckSession(backendJobId: string) {
    openSessionRecovery(backendJobId)
  }

  // Panel is always mounted so the WS socket stays alive, but renders
  // nothing when there are no downloads in the queue.
  if (!isPanelVisible) return null

  // Collapsed summary text
  const summaryParts: string[] = []
  if (activeCount > 0) summaryParts.push(`${activeCount} active`)
  if (activeCount > 0) summaryParts.push(`${avgProgress}% avg`)
  if (queuedCount > 0) summaryParts.push(`${queuedCount} queued`)
  const summaryText = summaryParts.length > 0 ? summaryParts.join(' · ') : 'Processing…'

  return (
    <div
      role="region"
      aria-label="Download panel"
      aria-busy={activeCount > 0 || undefined}
      className={cn(
        // Position — fixed above PlayerBar (wireframes §2)
        'fixed bottom-20 left-0 right-0',
        // Stacking — z-panel: 150 (design-system §1.5)
        'z-panel',
        // Surface + separator
        'bg-surface-console border-t border-subtle',
      )}
    >
      {/* ── Expanded job list (grows upward) ──────────────────────────── */}
      <AnimatePresence initial={false}>
        {isPanelExpanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-subtle px-4 py-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-secondary">
                  Downloads
                </span>
                {activeCount > 0 && (
                  <span className="font-mono text-xs text-secondary">
                    Active: {activeCount}
                  </span>
                )}
                {queuedCount > 0 && (
                  <span className="font-mono text-xs text-secondary">
                    Queue: {queuedCount}
                  </span>
                )}
                {!wsConnected && (
                  <span className="font-mono text-xs text-semantic-warning animate-pulse">
                    ◌ Reconnecting…
                  </span>
                )}
                {isRetrying && (
                  <span
                    role="status"
                    aria-live="polite"
                    className="font-mono text-xs text-semantic-info animate-pulse"
                  >
                    ↻ Retrying…
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* Clear completed */}
                {completedCount > 0 && (
                  <button
                    type="button"
                    onClick={clearCompleted}
                    aria-label={`Clear ${completedCount} completed download${completedCount !== 1 ? 's' : ''}`}
                    className={cn(
                      'font-sans text-xs text-secondary',
                      'hover:text-primary transition-colors duration-100',
                      'focus-visible:outline-none focus-visible:shadow-glow-focus rounded-sm',
                    )}
                  >
                    Clear {completedCount} ✕
                  </button>
                )}

                {/* Collapse */}
                <button
                  type="button"
                  onClick={() => setPanelExpanded(false)}
                  aria-label="Collapse download panel"
                  className={cn(
                    'ml-2 font-mono text-xs text-secondary',
                    'hover:text-primary transition-colors duration-100',
                    'focus-visible:outline-none focus-visible:shadow-glow-focus rounded-sm',
                  )}
                >
                  ∧
                </button>
              </div>
            </div>

            {/* Job list */}
            <div
              role="list"
              aria-label={`${visibleJobs.length} download job${visibleJobs.length !== 1 ? 's' : ''}`}
              className="max-h-[280px] divide-y divide-surface-studio overflow-y-auto"
            >
              {visibleJobs.length === 0 ? (
                /* Empty state */
                <div
                  role="status"
                  className="flex items-center justify-center py-8"
                >
                  <p className="font-sans text-sm text-disabled">No active downloads</p>
                </div>
              ) : (
                visibleJobs.map((job) => (
                  <div key={job.id} role="listitem">
                    <DownloadJobItem
                      job={job}
                      glowActive={glowEligible.has(job.id)}
                      onPause={pause}
                      onResume={resume}
                      onCancel={cancel}
                      onRemove={removeJob}
                      onCheckSession={handleCheckSession}
                    />
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Collapsed summary bar (always visible) ────────────────────── */}
      <div
        className="flex h-10 items-center justify-between px-4"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-teal-500" aria-hidden="true">↓</span>
          <span className="font-mono text-xs text-secondary">
            {summaryText}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setPanelExpanded(!isPanelExpanded)}
          aria-label={isPanelExpanded ? 'Collapse download panel' : 'Expand download panel'}
          aria-expanded={isPanelExpanded}
          className={cn(
            'font-mono text-xs text-secondary',
            'hover:text-primary transition-colors duration-100',
            'focus-visible:outline-none focus-visible:shadow-glow-focus rounded-sm px-1',
          )}
        >
          {isPanelExpanded ? '∧ Collapse' : '∨ Expand'}
        </button>
      </div>
    </div>
  )
}
