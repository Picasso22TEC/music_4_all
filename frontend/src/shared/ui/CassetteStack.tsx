'use client'

import { memo } from 'react'

import { cn } from '@/shared/lib/cn'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CassetteStackProps {
  className?: string
}

// ─── Piezas ───────────────────────────────────────────────────────────────────
// Cassette abstracto: cuerpo redondeado + ventana con dos carretes y cinta.
// Coordenadas y rotaciones fijas (sin aleatoriedad → sin hydration mismatch).

interface CassetteProps {
  x: number
  y: number
  rotate: number
  bodyClass: string
}

function Cassette({ x, y, rotate, bodyClass }: CassetteProps) {
  const cx = x + 42
  const cy = y + 12

  return (
    <g transform={`rotate(${rotate} ${cx} ${cy})`}>
      <rect x={x} y={y} width="84" height="24" rx="2.5" className={bodyClass} />
      <rect x={x + 14} y={y + 5} width="56" height="11" rx="1.5" className="fill-surface-void/70" />
      {/* Cinta entre carretes */}
      <rect x={x + 33} y={y + 8} width="18" height="5" rx="1" className="fill-teal-700/25" />
      {/* Carretes */}
      <circle cx={x + 26} cy={y + 10.5} r="3.5" className="fill-none stroke-ghost" strokeWidth="1.5" />
      <circle cx={x + 58} cy={y + 10.5} r="3.5" className="fill-none stroke-ghost" strokeWidth="1.5" />
      {/* Tornillos inferiores */}
      <circle cx={x + 4} cy={y + 20} r="1" className="fill-ghost/60" />
      <circle cx={x + 80} cy={y + 20} r="1" className="fill-ghost/60" />
    </g>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Cassettes apilados decorativos — pila de tres cassettes planos con
 * rotaciones desalineadas, utilería de la tienda (Fase 15).
 *
 * 100% estático (cero animación, cero JS por frame) y 100% decorativo
 * (DESIGN_SYSTEM_VISION §11): aria-hidden, pointer-events-none, sin stores
 * ni WebSocket. Solo tokens existentes: cuerpos surface-*, carretes ghost
 * y cinta teal-700 a baja opacidad (misma familia que AudioWaves).
 */
export const CassetteStack = memo(function CassetteStack({ className }: CassetteStackProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 96"
      className={cn('pointer-events-none select-none', className)}
    >
      {/* Sombra sobre el suelo */}
      <ellipse cx="60" cy="92" rx="44" ry="3" className="fill-surface-void/60" />

      {/* Pila — de abajo hacia arriba, cada una con su desalineación */}
      <Cassette x={18} y={62} rotate={-1.5} bodyClass="fill-surface-rack/85" />
      <Cassette x={14} y={36} rotate={2} bodyClass="fill-surface-console/90" />
      <Cassette x={24} y={10} rotate={-3} bodyClass="fill-surface-studio/90" />
    </svg>
  )
})
