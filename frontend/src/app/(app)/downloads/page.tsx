'use client'

import { openSessionRecovery } from '@/features/auth'
import { useDownloadActions, useDownloadQueue } from '@/features/downloads'
import { DownloadJobItem } from '@/widgets/download-panel'
import { Badge, Card } from '@/shared/ui'

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Full-page view of the download queue (TD-10).
 *
 * Reuses the same store (downloads.store), the same WS-driven data
 * (useDownloadSocket is mounted as a singleton by DownloadPanel in
 * (app)/layout.tsx — no second connection is opened here), and the same
 * queue categorization (useDownloadQueue) and pause/resume/cancel wiring
 * (useDownloadActions) as the DownloadPanel overlay, so the two views never
 * drift out of sync.
 */
export default function DownloadsPage() {
  const {
    wsConnected,
    clearCompleted,
    removeJob,
    visibleJobs,
    glowEligible,
    activeCount,
    queuedCount,
    completedCount,
    errorCount,
  } = useDownloadQueue()

  const { pause, resume, cancel } = useDownloadActions()

  /** Manual "Check Session" from DownloadJobItem error state */
  function handleCheckSession(backendJobId: string) {
    openSessionRecovery(backendJobId)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-sans text-2xl font-bold text-primary">Downloads</h1>
          <p className="mt-1 font-sans text-sm text-secondary">
            Full download queue — active, queued, completed, and failed jobs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!wsConnected && (
            <Badge variant="status-warn" dot>Offline</Badge>
          )}
          {activeCount > 0 && (
            <Badge variant="status-info" dot>{activeCount} active</Badge>
          )}
          {queuedCount > 0 && (
            <Badge variant="status-queue" dot>{queuedCount} queued</Badge>
          )}
          {errorCount > 0 && (
            <Badge variant="status-error" dot>{errorCount} error</Badge>
          )}
          {completedCount > 0 && (
            <button
              type="button"
              onClick={clearCompleted}
              aria-label={`Clear ${completedCount} completed download${completedCount !== 1 ? 's' : ''}`}
              className="font-sans text-xs text-secondary hover:text-primary transition-colors duration-100 focus-visible:outline-none focus-visible:shadow-glow-focus rounded-sm"
            >
              Clear {completedCount} completed
            </button>
          )}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <section aria-label="Download queue" aria-busy={activeCount > 0 || undefined}>
        {visibleJobs.length === 0 ? (
          /* Empty state */
          <Card className="flex flex-col items-center gap-4 py-16 text-center" role="status">
            <span aria-hidden="true" className="select-none font-mono text-5xl text-disabled">
              ↓
            </span>
            <p className="font-sans text-base font-medium text-primary">No active downloads</p>
            <p className="max-w-sm font-sans text-sm text-secondary">
              Search for an album or track from the Dashboard to start a download.
            </p>
          </Card>
        ) : (
          <Card noPadding className="overflow-hidden">
            <div
              role="list"
              aria-label={`${visibleJobs.length} download job${visibleJobs.length !== 1 ? 's' : ''}`}
              className="flex flex-col divide-y divide-subtle"
            >
              {visibleJobs.map((job) => (
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
              ))}
            </div>
          </Card>
        )}
      </section>
    </div>
  )
}
