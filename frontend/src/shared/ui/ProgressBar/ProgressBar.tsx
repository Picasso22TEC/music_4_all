'use client'

import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
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

// ─── Style maps (Fase 3 — brillo neón dinámico) ──────────────────────────────

const SIZES: Record<ProgressBarSize, string> = {
  sm: 'h-1',  // 4px
  md: 'h-2',  // 8px
  lg: 'h-3',  // 12px
}

const FILL_COLORS: Record<ProgressBarVariant, string> = {
  default:       'bg-teal-400',
  download:      'bg-teal-400',
  success:       'bg-semantic-success',
  error:         'bg-semantic-error',
  indeterminate: 'bg-teal-400',
}

// Brillo fijo (box-shadow) por variante — aplicado mientras animated=true.
const ANIMATED_GLOWS: Partial<Record<ProgressBarVariant, string>> = {
  download: 'shadow-glow-active',
  success:  'shadow-glow-success',
  error:    'shadow-glow-error',
}

// Shimmer del estado indeterminate — sweep de luz sobre teal-400 (tokens, sin hex sueltos)
const SHIMMER_GRADIENT =
  'bg-gradient-to-r from-teal-700 via-teal-300 to-teal-700 bg-[length:200%_100%]'

// ─── Component ────────────────────────────────────────────────────────────────

export function ProgressBar({
  value = 0,
  variant = 'default',
  size = 'md',
  animated = false,
  label,
  className,
}: ProgressBarProps) {
  const reducedMotion = useReducedMotion()
  const isIndeterminate = variant === 'indeterminate'
  const clampedValue = Math.min(100, Math.max(0, value))

  const glowClass = animated ? ANIMATED_GLOWS[variant] : undefined
  // "Brillo pulsante" — solo download, y solo si el usuario no pide menos movimiento.
  const pulseClass = animated && variant === 'download' && !reducedMotion ? 'animate-pulse-neon' : undefined

  return (
    <div
      role="progressbar"
      aria-valuenow={isIndeterminate ? undefined : clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      aria-valuetext={isIndeterminate ? 'Loading…' : `${clampedValue}%`}
      className={cn(
        // Track — Fase 3: fondo surface-rack, completamente redondeado
        'relative w-full overflow-hidden rounded-full bg-surface-rack',
        SIZES[size],
        className
      )}
    >
      <div
        className={cn(
          'absolute left-0 top-0 h-full rounded-full',
          isIndeterminate ? SHIMMER_GRADIENT : FILL_COLORS[variant],
          // Transición suave del ancho/brillo (spec: "transition-all duration-300")
          'transition-all duration-300',
          // Shimmer solo si se permite animación (a11y — prefers-reduced-motion)
          isIndeterminate && !reducedMotion && 'animate-shimmer',
          glowClass,
          pulseClass
        )}
        style={isIndeterminate ? { width: '100%' } : { width: `${clampedValue}%` }}
      />
    </div>
  )
}
