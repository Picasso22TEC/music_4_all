'use client'

import { memo } from 'react'

import { cn } from '@/shared/lib/cn'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PottedPlantProps {
  className?: string
}

// ─── Geometría ────────────────────────────────────────────────────────────────
// Sansevieria abstracta: hojas como triángulos apuntados en dos planos de
// profundidad (trasero más tenue, delantero más presente). Coordenadas fijas
// (sin aleatoriedad → sin riesgo de hydration mismatch).

const BACK_BLADES = [
  '40,118 22,52 50,118',
  '55,118 46,24 68,118',
  '72,118 96,44 84,118',
] as const

const FRONT_BLADES = [
  '44,118 34,68 58,118',
  '58,118 60,36 74,118',
  '70,118 88,64 82,118',
  '50,118 42,84 60,118',
] as const

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Planta de interior decorativa — silueta geométrica plana de sansevieria
 * en maceta, utilería de la esquina de la tienda (Fase 15).
 *
 * 100% estática (cero animación, cero JS por frame) y 100% decorativa
 * (DESIGN_SYSTEM_VISION §11): aria-hidden, pointer-events-none, sin stores
 * ni WebSocket. Solo tokens existentes: hojas teal-700 a baja opacidad
 * (misma familia que AudioWaves), maceta en surface-rack.
 */
export const PottedPlant = memo(function PottedPlant({ className }: PottedPlantProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 160"
      className={cn('pointer-events-none select-none', className)}
    >
      {/* Hojas — plano trasero */}
      {BACK_BLADES.map((points) => (
        <polygon key={points} points={points} className="fill-teal-700/15" />
      ))}

      {/* Hojas — plano delantero */}
      {FRONT_BLADES.map((points) => (
        <polygon key={points} points={points} className="fill-teal-700/25" />
      ))}

      {/* Sombra sobre el suelo */}
      <ellipse cx="60" cy="153" rx="26" ry="3" className="fill-surface-void/60" />

      {/* Maceta — cuerpo trapezoidal + borde */}
      <path d="M42 123 L78 123 L73 152 L47 152 Z" className="fill-surface-rack/80" />
      <rect x="38" y="116" width="44" height="7" rx="1.5" className="fill-surface-rack" />
    </svg>
  )
})
