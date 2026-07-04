import { ListMusic } from 'lucide-react'

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Empty state for the history page — shown when no downloads have been recorded.
 */
export function HistoryEmptyState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <ListMusic aria-hidden="true" className="mb-4 h-12 w-12 text-disabled" />
      <h2 className="mb-2 font-mono text-heading font-semibold text-primary">
        No downloads yet
      </h2>
      <p className="max-w-xs font-sans text-sm text-secondary">
        Your completed downloads will appear here. Start by searching for an album on the dashboard.
      </p>
    </div>
  )
}
