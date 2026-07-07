'use client'

import { memo } from 'react'

import { cn } from '@/shared/lib/cn'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VintageSpeakerProps {
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Altavoz vintage decorativo — silueta geométrica plana de caja acústica con
 * tweeter y woofer de círculos concéntricos, utilería de la tienda (Fase 15).
 *
 * 100% estático (cero animación, cero JS por frame) y 100% decorativo
 * (DESIGN_SYSTEM_VISION §11): aria-hidden, pointer-events-none, sin stores
 * ni WebSocket. Solo tokens existentes: superficies surface-* con anillos
 * ghost y acentos teal-700 a baja opacidad (misma familia que AudioWaves).
 */
export const VintageSpeaker = memo(function VintageSpeaker({ className }: VintageSpeakerProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 140"
      className={cn('pointer-events-none select-none', className)}
    >
      {/* Sombra sobre el suelo */}
      <ellipse cx="50" cy="136" rx="34" ry="3" className="fill-surface-void/60" />

      {/* Caja — marco exterior + panel frontal */}
      <rect x="12" y="6" width="76" height="128" rx="4" className="fill-surface-rack/70" />
      <rect x="17" y="11" width="66" height="118" rx="3" className="fill-surface-console/90" />

      {/* Tweeter — anillo + domo */}
      <circle cx="50" cy="38" r="13" className="fill-surface-void/80" />
      <circle cx="50" cy="38" r="13" className="fill-none stroke-ghost" strokeWidth="1.5" />
      <circle cx="50" cy="38" r="5" className="fill-teal-700/30" />

      {/* Woofer — anillo exterior, cono y casquete */}
      <circle cx="50" cy="92" r="27" className="fill-surface-void/80" />
      <circle cx="50" cy="92" r="27" className="fill-none stroke-ghost" strokeWidth="1.5" />
      <circle cx="50" cy="92" r="19" className="fill-teal-700/20" />
      <circle cx="50" cy="92" r="8" className="fill-surface-rack" />

      {/* Patas */}
      <rect x="22" y="132" width="10" height="4" rx="1" className="fill-surface-rack" />
      <rect x="68" y="132" width="10" height="4" rx="1" className="fill-surface-rack" />
    </svg>
  )
})
