'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
import { cn } from '@/shared/lib/cn'

// ─── Types ───────────────────────────────────────────────────────────────────

export type NeonArcsDensity = 'low' | 'medium' | 'high'

export interface NeonArcsProps {
  /** Cuando es false no renderiza nada. */
  active?: boolean
  density?: NeonArcsDensity
  className?: string
}

interface Arc {
  id: number
  left: number // % del contenedor (borne del tubo)
  top: number // %
  rotate: number // deg — orientación del disparo hacia afuera
  scale: number
  points: string // polilínea quebrada (rayo)
  duration: number // s — destello ultra rápido (fogonazo de soldadura)
  delay: number // s
  repeatDelay: number // s — ráfagas impredecibles (a veces varios segundos sin nada)
}

// ─── Config ───────────────────────────────────────────────────────────────────
// Chispazos secos y violentos: líneas finas quebradas blanco cegador con halo
// violeta/cian. Saltan desde los bornes (extremos) del letrero, en ráfagas
// esporádicas. Sólo opacity/transform.

const DENSITY_COUNTS: Record<NeonArcsDensity, number> = {
  low: 5,
  medium: 10,
  high: 18,
}

// Bornes: puntos alrededor del perímetro del letrero (extremos de los tubos).
// Se agrupan varios arcos por borne → a veces saltan 2–3 seguidos en la misma
// esquina y luego nada.
const ANCHORS = [
  { left: 5, top: 14 },
  { left: 95, top: 16 },
  { left: 50, top: 6 },
  { left: 8, top: 88 },
  { left: 92, top: 86 },
  { left: 33, top: 94 },
  { left: 68, top: 92 },
]

// ─── Seeded RNG (mulberry32) — layout fijo durante el ciclo de vida ───────────

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

function jaggedPoints(rand: () => number): string {
  // Rayo corto y quebrado desde (0,0) hacia afuera.
  const segments = 3 + Math.floor(rand() * 3)
  let x = 0
  let y = 0
  const pts = [`${x},${y}`]
  for (let i = 0; i < segments; i++) {
    x += 4 + rand() * 8
    y += (rand() - 0.5) * 11
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return pts.join(' ')
}

function generateArcs(rand: () => number, count: number): Arc[] {
  return Array.from({ length: count }, (_, id) => {
    const anchor = ANCHORS[id % ANCHORS.length]
    return {
      id,
      left: anchor.left + (rand() - 0.5) * 8,
      top: anchor.top + (rand() - 0.5) * 8,
      rotate: rand() * 360,
      scale: 0.8 + rand() * 0.9,
      points: jaggedPoints(rand),
      duration: 0.07 + rand() * 0.09, // 0.07–0.16s — fogonazo brevísimo
      delay: rand() * 3,
      repeatDelay: 0.8 + rand() * 3.4, // ráfagas esporádicas e impredecibles
    }
  })
}

// ─── Component ────────────────────────────────────────────────────────────────
//
// Capa de arcos eléctricos, auto-contenida (no store/query). El sorteo usa
// Math.random() (cliente) → se difiere a un useEffect post-montaje (SSR/primer
// render quedan sin arcos, evitando mismatch). Bajo prefers-reduced-motion no
// renderiza nada (los chispazos cegadores no deben dispararse).

function NeonArcsComponent({ active = true, density = 'medium', className }: NeonArcsProps) {
  const reducedMotion = useReducedMotion()
  const seedRef = useRef<number | null>(null)
  const [arcs, setArcs] = useState<Arc[]>([])

  useEffect(() => {
    if (reducedMotion || !active) {
      setArcs([])
      return
    }
    if (seedRef.current === null) {
      seedRef.current = Math.floor(Math.random() * 2 ** 31)
    }
    setArcs(generateArcs(mulberry32(seedRef.current), DENSITY_COUNTS[density]))
  }, [density, reducedMotion, active])

  if (reducedMotion || !active) return null

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-visible', className)}
    >
      {arcs.map((arc) => (
        <motion.svg
          key={arc.id}
          className="absolute overflow-visible"
          width="48"
          height="32"
          viewBox="-4 -16 56 32"
          style={{
            left: `${arc.left}%`,
            top: `${arc.top}%`,
            rotate: `${arc.rotate}deg`,
            scale: arc.scale,
            // Núcleo blanco cegador + halo violeta/cian.
            filter:
              'drop-shadow(0 0 2px white) drop-shadow(0 0 5px var(--color-queue)) drop-shadow(0 0 9px var(--color-synthwave-blue))',
            willChange: 'opacity',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.7, 0] }}
          transition={{
            duration: arc.duration,
            delay: arc.delay,
            repeat: Infinity,
            repeatDelay: arc.repeatDelay,
            ease: 'linear',
          }}
        >
          <polyline
            points={arc.points}
            fill="none"
            stroke="white"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      ))}
    </div>
  )
}

export const NeonArcs = memo(NeonArcsComponent)
NeonArcs.displayName = 'NeonArcs'
