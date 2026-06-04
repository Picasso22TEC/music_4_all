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
      <span
        className="mb-4 select-none font-mono text-5xl text-disabled"
        aria-hidden="true"
      >
        ⊘
      </span>
      <h2 className="mb-2 font-mono text-heading font-semibold text-primary">
        No downloads yet
      </h2>
      <p className="max-w-xs font-sans text-sm text-secondary">
        Your completed downloads will appear here. Start by searching for an album on the dashboard.
      </p>
    </div>
  )
}
