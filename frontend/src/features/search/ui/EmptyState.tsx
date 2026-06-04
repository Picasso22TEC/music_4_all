import { Button } from '@/shared/ui/Button'
import { cn } from '@/shared/lib/cn'

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmptyStateVariant = 'initial' | 'no-results' | 'error'

export interface EmptyStateProps {
  variant: EmptyStateVariant
  /** Query string shown in 'no-results' message */
  query?: string
  /** Retry callback shown in 'error' variant */
  onRetry?: () => void
}

// ─── Variant configuration ────────────────────────────────────────────────────

type VariantConfig = {
  icon: string
  title: string
  description: (query?: string) => string
}

const VARIANTS: Record<EmptyStateVariant, VariantConfig> = {
  initial: {
    icon: '⊘',
    title: 'Start your search',
    description: () =>
      'Paste a Tidal URL or type an album/track name to begin.',
  },
  'no-results': {
    icon: '≈',
    title: 'No results found',
    description: (query) =>
      query
        ? `No results for "${query}". Try a different search or paste a Tidal URL directly.`
        : 'No results found. Try a different search.',
  },
  error: {
    icon: '✕',
    title: 'Search error',
    description: () =>
      'Something went wrong while searching. Please try again.',
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Empty state placeholder for the search area.
 * Used for three contexts:
 *  - initial: no search has been performed yet (State A in wireframes)
 *  - no-results: search returned 0 results (State C-zero)
 *  - error: search request failed
 */
export function EmptyState({ variant, query, onRetry }: EmptyStateProps) {
  const config = VARIANTS[variant]
  const description = config.description(query)

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      {/* Icon */}
      <span
        aria-hidden="true"
        className={cn(
          'mb-4 select-none font-mono text-5xl',
          variant === 'error'    && 'text-semantic-error',
          variant === 'initial'  && 'text-disabled',
          variant === 'no-results' && 'text-disabled',
        )}
      >
        {config.icon}
      </span>

      {/* Title */}
      <h2 className="mb-2 font-mono text-heading font-semibold text-primary">
        {config.title}
      </h2>

      {/* Description */}
      <p className="max-w-xs font-sans text-sm text-secondary">
        {description}
      </p>

      {/* Retry button (error only) */}
      {variant === 'error' && onRetry && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onRetry}
          aria-label="Retry search"
          className="mt-6"
        >
          Try again
        </Button>
      )}
    </div>
  )
}
