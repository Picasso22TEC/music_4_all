'use client'

import { memo, useId } from 'react'

import { cn } from '@/shared/lib/cn'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CassetteDeckProps {
  /** Reels spin while true. The caller gates this on isPlaying && !reducedMotion. */
  spinning: boolean
  /**
   * Título de la canción, escrito con plumón en la etiqueta (homenaje al
   * "Awesome Mix"). Si se omite, se dibujan las líneas decorativas de siempre.
   */
  title?: string
  className?: string
}

// ─── Reel ────────────────────────────────────────────────────────────────────
// Un carrete = tape enrollado + cubo dentado + marcador. El grupo gira sobre su
// propio centro (transform-box: fill-box + origin center, patron de Turntable);
// los dientes y el marcador teal hacen perceptible la rotacion.

function Reel({ cx, cy, spinning }: { cx: number; cy: number; spinning: boolean }) {
  const teeth = Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 * Math.PI) / 180
    const x1 = cx + 5 * Math.cos(a)
    const y1 = cy + 5 * Math.sin(a)
    const x2 = cx + 9 * Math.cos(a)
    const y2 = cy + 9 * Math.sin(a)
    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        className="stroke-ghost/70"
        strokeWidth="2"
        strokeLinecap="round"
      />
    )
  })

  return (
    <g
      className={cn(spinning && 'animate-reel-spin')}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      {/* Tape enrollado (anillos concentricos) */}
      <circle cx={cx} cy={cy} r="22" className="fill-teal-700/15" />
      <circle cx={cx} cy={cy} r="21" className="fill-none stroke-ghost/25" strokeWidth="1" />
      <circle cx={cx} cy={cy} r="16" className="fill-none stroke-ghost/20" strokeWidth="1" />
      {/* Cubo dentado */}
      <circle cx={cx} cy={cy} r="9" className="fill-surface-rack stroke-ghost/50" strokeWidth="1" />
      {teeth}
      <circle cx={cx} cy={cy} r="2" className="fill-surface-void" />
      {/* Marcador — hace visible el giro */}
      <circle cx={cx} cy={cy - 15} r="1.6" className="fill-teal-400" />
    </g>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Cassette deck del reproductor Now Playing (Walkman). Interpretacion plana y
 * por tokens (no fotorrealista), coherente con la escena de la tienda (Fase 15)
 * y con CassetteStack. Los dos carretes giran mientras `spinning` (isPlaying);
 * al pausar/STOP se detienen. Solo transform (rotate) — sin destellos (WCAG
 * 2.3.1). Puramente grafico: aria-hidden; el estado audible lo comunica el
 * texto aria-live del reproductor.
 */
export const CassetteDeck = memo(function CassetteDeck({ spinning, title, className }: CassetteDeckProps) {
  const clipId = useId()
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 220 132"
      className={cn('select-none', className)}
    >
      {/* Cuerpo */}
      <rect x="6" y="6" width="208" height="120" rx="10" className="fill-surface-console stroke-ghost/50" strokeWidth="1.5" />
      {/* Bisel interior */}
      <rect x="14" y="14" width="192" height="104" rx="6" className="fill-surface-studio" />
      {/* Ventana */}
      <rect x="24" y="26" width="172" height="56" rx="4" className="fill-surface-void stroke-ghost/40" strokeWidth="1" />

      {/* Cinta expuesta entre carretes (borde inferior de la ventana) */}
      <path d="M72 74 Q 110 86 148 74" className="fill-none stroke-teal-700/35" strokeWidth="1.5" />

      {/* Carretes */}
      <Reel cx={72} cy={54} spinning={spinning} />
      <Reel cx={148} cy={54} spinning={spinning} />

      {/* Etiqueta — título en plumón (Awesome Mix) o líneas decorativas */}
      <rect x="52" y="92" width="116" height="22" rx="2" className="fill-surface-void/60" />
      {title ? (
        <>
          <clipPath id={clipId}>
            <rect x="52" y="92" width="116" height="22" rx="2" />
          </clipPath>
          <text
            x="58"
            y="108"
            clipPath={`url(#${clipId})`}
            transform="rotate(-2 110 103)"
            className="fill-synthwave-blue font-marker text-[11px]"
          >
            {title}
          </text>
        </>
      ) : (
        <>
          <line x1="60" y1="99" x2="150" y2="99" className="stroke-ghost/40" strokeWidth="1.5" />
          <line x1="60" y1="106" x2="120" y2="106" className="stroke-teal-700/40" strokeWidth="1.5" />
        </>
      )}

      {/* Tornillos */}
      <circle cx="18" cy="18" r="1.5" className="fill-ghost/60" />
      <circle cx="202" cy="18" r="1.5" className="fill-ghost/60" />
      <circle cx="18" cy="114" r="1.5" className="fill-ghost/60" />
      <circle cx="202" cy="114" r="1.5" className="fill-ghost/60" />
    </svg>
  )
})
