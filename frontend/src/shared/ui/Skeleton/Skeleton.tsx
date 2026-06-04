import { cn } from '@/shared/lib/cn'

// ─── Types ───────────────────────────────────────────────────────────────────

export type SkeletonVariant = 'rectangular' | 'text' | 'circular'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant
}

// ─── Component (design-system §4.1) ──────────────────────────────────────────
//
// Uses the .skeleton-shimmer CSS class defined in globals.css.
// Base color: surface-studio (#1A2330), shimmer: surface-rack (#21303F)

export function Skeleton({ variant = 'rectangular', className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'skeleton-shimmer',
        variant === 'rectangular' && 'rounded-md',
        variant === 'text'        && 'rounded-sm h-[1em] w-full',
        variant === 'circular'    && 'rounded-full',
        className
      )}
      {...props}
    />
  )
}
