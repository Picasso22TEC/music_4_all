'use client'

import { memo } from 'react'

import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
import { cn } from '@/shared/lib/cn'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TurntableProps {
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Tocadiscos decorativo — mesa con deck y plato girando, utilería de la
 * tienda (Fase 15). Perspectiva plana mixta (mesa frontal + plato cenital),
 * estilo flat coherente con el resto de la escena.
 *
 * 100% decorativo (DESIGN_SYSTEM_VISION §11): aria-hidden,
 * pointer-events-none, sin stores ni WebSocket. El giro del plato es CSS puro
 * (animate-record-spin, solo rotate con transform-box fill-box) y se omite
 * bajo prefers-reduced-motion: plato detenido. El punto marcador sobre el
 * vinilo hace perceptible la rotación lenta.
 */
export const Turntable = memo(function Turntable({ className }: TurntableProps) {
  const reducedMotion = useReducedMotion()

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 140 120"
      className={cn('pointer-events-none select-none', className)}
    >
      {/* Sombra sobre el suelo */}
      <ellipse cx="70" cy="116" rx="50" ry="3" className="fill-surface-void/60" />

      {/* Mesa — tablero + patas */}
      <rect x="10" y="70" width="120" height="6" rx="2" className="fill-surface-rack" />
      <rect x="18" y="76" width="5" height="38" rx="1" className="fill-surface-rack/80" />
      <rect x="117" y="76" width="5" height="38" rx="1" className="fill-surface-rack/80" />

      {/* Deck */}
      <rect x="22" y="26" width="96" height="44" rx="3" className="fill-surface-console/90" />

      {/* Plato + vinilo — grupo giratorio (solo transform) */}
      <g
        className={cn(!reducedMotion && 'animate-record-spin')}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      >
        <circle cx="56" cy="48" r="19" className="fill-surface-void/90" />
        <circle cx="56" cy="48" r="13" className="fill-none stroke-ghost/60" strokeWidth="1" />
        <circle cx="56" cy="48" r="6" className="fill-teal-700/30" />
        <circle cx="56" cy="48" r="1.5" className="fill-ghost" />
        {/* Marcador — hace visible el giro lento */}
        <circle cx="56" cy="32" r="1.5" className="fill-ghost/70" />
      </g>

      {/* Brazo — pivote + brazo + cabezal */}
      <circle cx="100" cy="34" r="3.5" className="fill-surface-rack" />
      <line x1="100" y1="34" x2="80" y2="54" className="stroke-ghost" strokeWidth="1.5" />
      <rect x="76" y="52" width="6" height="5" rx="1" className="fill-surface-rack" />
    </svg>
  )
})
