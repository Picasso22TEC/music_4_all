import { forwardRef } from 'react'

import { cn } from '@/shared/lib/cn'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Renders with shadow-md instead of shadow-sm */
  elevated?: boolean
  /** Removes default padding */
  noPadding?: boolean
  /** Renders as <article> for semantic HTML (album/track cards) */
  asArticle?: boolean
}

// ─── Component (design-system §3.3) ──────────────────────────────────────────

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ elevated = false, noPadding = false, asArticle = false, className, children, ...props }, ref) => {
    const Tag = asArticle ? 'article' : 'div'

    return (
      <Tag
        ref={ref as React.Ref<HTMLDivElement>}
        className={cn(
          // Surface + border (design-system §3.3)
          'bg-surface-console border rounded-md',
          // Elevation shadow
          elevated ? 'shadow-md' : 'shadow-sm',
          // Hover elevation
          'transition-shadow duration-150 ease-out',
          'hover:shadow-md',
          // Padding
          !noPadding && 'p-4',
          className
        )}
        {...props}
      >
        {children}
      </Tag>
    )
  }
)

Card.displayName = 'Card'
