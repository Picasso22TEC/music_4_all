'use client'

import { memo, useMemo } from 'react'

import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
import { cn } from '@/shared/lib/cn'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AudioWavesProps {
  /** Número de barras del ecualizador decorativo. */
  bars?: number
  className?: string
}

// ─── Seeded RNG (mulberry32) — mismo patrón que NeonArcs ──────────────────────
// Semilla fija: las alturas base son deterministas, el HTML del servidor y el
// del cliente coinciden (sin hydration mismatch) y no se recalculan por render.

function mulberry32(seed: number) {
  let a = seed
  return (): number => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SEED = 404

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Ecualizador decorativo de fondo — "skyline" de barras teal a baja opacidad.
 *
 * Puramente ambiental (DESIGN_SYSTEM_VISION §11): aria-hidden,
 * pointer-events-none, sin suscripciones a stores ni WebSocket. El movimiento
 * es 100% CSS: cada barra lleva animate-audio-wave (solo scaleY compuesto,
 * origen en la base) y los desfases se reparten por nth-child en globals.css.
 *
 * Bajo prefers-reduced-motion las barras quedan como skyline estático.
 */
export const AudioWaves = memo(function AudioWaves({
  bars = 28,
  className,
}: AudioWavesProps) {
  const reducedMotion = useReducedMotion()

  // Alturas base (% del contenedor) calculadas una sola vez por cantidad.
  const heights = useMemo(() => {
    const rand = mulberry32(SEED)
    return Array.from({ length: bars }, () => 25 + Math.round(rand() * 70))
  }, [bars])

  return (
    <div
      aria-hidden="true"
      className={cn(
        'audio-waves pointer-events-none select-none',
        'flex items-end gap-1',
        className,
      )}
    >
      {heights.map((height, i) => (
        <span
          key={i}
          className={cn(
            'flex-1 rounded-t-sm bg-teal-500/10',
            !reducedMotion && 'animate-audio-wave',
          )}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  )
})
