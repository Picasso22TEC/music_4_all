'use client'

import { useShallow } from 'zustand/react/shallow'

import {
  useDownloadsStore,
  useUpdateDownloadMutation,
  useCancelDownloadMutation,
  selectGlowEligibleIds,
} from '@/features/downloads'
import { openSessionRecovery } from '@/features/auth'
import { DownloadJobItem } from '@/widgets/download-panel'

export default function DownloadsPage() {
  const queue          = useDownloadsStore(useShallow((s) => s.queue))
  const clearCompleted = useDownloadsStore((s) => s.clearCompleted)
  const removeJob      = useDownloadsStore((s) => s.removeJob)

  const updateMutation = useUpdateDownloadMutation()
  const cancelMutation = useCancelDownloadMutation()

  const glowEligible  = selectGlowEligibleIds(queue, false)

  const activeJobs    = queue.filter((j) => j.status === 'active' || j.status === 'paused')
  const queuedJobs    = queue.filter((j) => j.status === 'queued')
  const errorJobs     = queue.filter((j) => j.status === 'error')
  const completedJobs = queue.filter((j) => j.status === 'completed')
  const visibleJobs   = [...activeJobs, ...queuedJobs, ...errorJobs, ...completedJobs]

  function handlePause(backendJobId: string) {
    updateMutation.mutate({ jobId: backendJobId, action: 'pause' })
  }

  function handleResume(backendJobId: string) {
    updateMutation.mutate({ jobId: backendJobId, action: 'resume' })
  }

  function handleCancel(backendJobId: string) {
    cancelMutation.mutate(backendJobId)
  }

  function handleCheckSession(backendJobId: string) {
    openSessionRecovery(backendJobId)
  }

  if (visibleJobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
        <p className="font-sans text-sm text-disabled">No active downloads</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-sm font-semibold uppercase tracking-wider text-secondary">
          Downloads ({visibleJobs.length})
        </h1>
        {completedJobs.length > 0 && (
          <button
            type="button"
            onClick={clearCompleted}
            aria-label={`Clear ${completedJobs.length} completed download${completedJobs.length !== 1 ? 's' : ''}`}
            className="font-sans text-xs text-secondary hover:text-primary transition-colors duration-100 focus-visible:outline-none focus-visible:shadow-glow-focus rounded-sm"
          >
            Clear {completedJobs.length} completed
          </button>
        )}
      </div>

      <div
        role="list"
        aria-label={`${visibleJobs.length} download job${visibleJobs.length !== 1 ? 's' : ''}`}
        className="flex flex-col divide-y divide-subtle bg-surface-console rounded"
      >
        {visibleJobs.map((job) => (
          <div key={job.id} role="listitem">
            <DownloadJobItem
              job={job}
              glowActive={glowEligible.has(job.id)}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
              onRemove={removeJob}
              onCheckSession={handleCheckSession}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
