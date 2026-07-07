'use client'

import { memo } from 'react'

import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
import { cn } from '@/shared/lib/cn'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SignFrameProps {
  /** Contenido del letrero (decorativo — el nombre accesible debe vivir fuera). */
  children: React.ReactNode
  className?: string
}

// ─── Config ───────────────────────────────────────────────────────────────────
// Remaches: puntos de 2px en las cuatro esquinas de la placa.

const RIVET_POSITIONS = [
  'left-0.5 top-0.5',
  'right-0.5 top-0.5',
  'bottom-0.5 left-0.5',
  'bottom-0.5 right-0.5',
] as const

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Marco del letrero — placa metálica con remaches colgada de dos cadenas,
 * como si el letrero pendiera físicamente del techo de la tienda.
 *
 * Escena decorativa (Fase 15, DESIGN_SYSTEM_VISION §11): aria-hidden,
 * pointer-events-none, sin stores ni WebSocket. Formas planas abstractas con
 * tokens existentes (border DEFAULT + ghost + surface-console) y sin glow
 * propio — el acento synthwave de la vista sigue siendo el NeonTitle.
 *
 * El balanceo pendular (animate-sign-sway, solo rotate con origen en las
 * cadenas) se omite bajo prefers-reduced-motion: placa colgada estática.
 */
export const SignFrame = memo(function SignFrame({ children, className }: SignFrameProps) {
  const reducedMotion = useReducedMotion()

  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none inline-flex select-none flex-col items-center',
        !reducedMotion && 'origin-top animate-sign-sway',
        className,
      )}
    >
      {/* Cadenas — dos líneas discontinuas (eslabones abstractos) que ocupan
          el espacio libre sobre la placa hasta el "techo" del contenedor. */}
      <span className="flex w-3/4 flex-1 justify-between">
        <span className="min-h-2 w-px border-l border-dashed border-ghost/80" />
        <span className="min-h-2 w-px border-l border-dashed border-ghost/80" />
      </span>

      {/* Placa — marco metálico plano con remaches en las esquinas. */}
      <span className="relative rounded-sm border bg-surface-console/50 px-2.5 py-1">
        {RIVET_POSITIONS.map((pos) => (
          <span
            key={pos}
            className={cn('absolute h-0.5 w-0.5 rounded-full bg-ghost', pos)}
          />
        ))}
        {children}
      </span>
    </span>
  )
})
