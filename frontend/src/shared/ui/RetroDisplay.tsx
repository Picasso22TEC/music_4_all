import { cn } from '@/shared/lib/cn'

// ─── Types ───────────────────────────────────────────────────────────────────

export type RetroDisplaySize = 'sm' | 'md' | 'lg'

export interface RetroDisplayProps {
  value: string
  size?: RetroDisplaySize
  className?: string
}

// ─── Config (FRONTEND_VISION.md — "Login inmersivo") ─────────────────────────
// Display retro estilo Nixie/VCR — sin parpadeo, ese efecto ya lo cubre NeonTitle.

const BOX_SIZES: Record<RetroDisplaySize, string> = {
  sm: 'h-6  w-5  text-sm',
  md: 'h-9  w-7  text-lg',
  lg: 'h-12 w-9  text-2xl',
}

// Referencia la CSS custom property del design system (globals.css), no un hex suelto.
const TUBE_GLOW = '0 0 4px var(--color-warning), 0 0 10px var(--color-warning)'

// ─── Component ────────────────────────────────────────────────────────────────

export function RetroDisplay({ value, size = 'md', className }: RetroDisplayProps) {
  return (
    <span
      role="img"
      aria-label={`Código de verificación: ${value}`}
      className={cn('inline-flex items-center gap-1', className)}
    >
      {value.split('').map((char, index) => (
        <span
          key={`${index}-${char}`}
          aria-hidden="true"
          className={cn(
            'flex items-center justify-center rounded-sm',
            'border border-semantic-warning/40 bg-surface-void',
            'font-mono font-bold text-semantic-warning',
            BOX_SIZES[size]
          )}
          style={{ textShadow: TUBE_GLOW }}
        >
          {char}
        </span>
      ))}
    </span>
  )
}
