import { cn } from '@/shared/lib/cn'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProgressBarVariant = 'default' | 'download' | 'success' | 'error' | 'indeterminate'
export type ProgressBarSize = 'sm' | 'md' | 'lg'

export interface ProgressBarProps {
  /** 0–100. Ignored when variant="indeterminate" */
  value?: number
  variant?: ProgressBarVariant
  size?: ProgressBarSize
  /** Adds glow shadow to the fill (download/success/error) */
  animated?: boolean
  /** Accessible label (spec §5 — aria-label on progressbar) */
  label?: string
  className?: string
}

// ─── Style maps (design-system §3.7) ─────────────────────────────────────────

const SIZES: Record<ProgressBarSize, string> = {
  sm: 'h-0.5',   // 2px
  md: 'h-1',     // 4px
  lg: 'h-2',     // 8px
}

const FILL_COLORS: Record<ProgressBarVariant, string> = {
  default:       'bg-teal-500',
  download:      'bg-semantic-info',
  success:       'bg-semantic-success',
  error:         'bg-semantic-error',
  indeterminate: 'bg-teal-500',
}

const ANIMATED_GLOWS: Partial<Record<ProgressBarVariant, string>> = {
  download: 'shadow-glow-download',
  success:  'shadow-glow-success',
  error:    'shadow-glow-error',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProgressBar({
  value = 0,
  variant = 'default',
  size = 'md',
  animated = false,
  label,
  className,
}: ProgressBarProps) {
  const isIndeterminate = variant === 'indeterminate'
  const clampedValue = Math.min(100, Math.max(0, value))

  return (
    <div
      role="progressbar"
      aria-valuenow={isIndeterminate ? undefined : clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      aria-valuetext={isIndeterminate ? 'Loading…' : `${clampedValue}%`}
      className={cn(
        // Track — design-system §3.7: "Track fondo: surface-rack"
        'relative w-full overflow-hidden rounded-none bg-surface-rack',
        SIZES[size],
        className
      )}
    >
      <div
        // Fill — spec §3.7: "Border-radius: radius-none — las barras son rectangulares"
        className={cn(
          'absolute left-0 top-0 h-full rounded-none',
          FILL_COLORS[variant],
          // Transition for normal progress (spec: "300ms ease-out")
          !isIndeterminate && 'transition-[width] duration-300 ease-out',
          // Indeterminate animation
          isIndeterminate && 'animate-progress-indeterminate',
          // Glow when animated (spec §3.7 — "Glow en download activo")
          animated && ANIMATED_GLOWS[variant],
        )}
        style={
          isIndeterminate
            ? { width: '40%' }
            : { width: `${clampedValue}%` }
        }
      />
    </div>
  )
}
