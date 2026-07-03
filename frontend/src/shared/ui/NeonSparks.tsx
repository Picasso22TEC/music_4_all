'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
import { cn } from '@/shared/lib/cn'

// ─── Types ───────────────────────────────────────────────────────────────────

export type NeonSparksDensity = 'low' | 'medium' | 'high'

export interface NeonSparksProps {
  /** Cuando es false no renderiza nada (p. ej. sparks sólo al hover de un botón). */
  active?: boolean
  density?: NeonSparksDensity
  className?: string
}

interface Spark {
  id: number
  left: number // % del contenedor
  top: number // % del contenedor
  length: number // px (chispa alargada)
  angle: number // deg — orientación del streak
  dx: number // px de recorrido
  dy: number // px de recorrido
  duration: number // s (rápido)
  delay: number // s
  repeatDelay: number // s — sporádico
}

// ─── Config ───────────────────────────────────────────────────────────────────
// Chispas eléctricas amarillas (token semantic-warning / --color-warning).
// Puramente decorativas: cortas, rápidas, con glow. transform + opacity únicamente.

const DENSITY_COUNTS: Record<NeonSparksDensity, number> = {
  low: 6,
  medium: 12,
  high: 20,
}

// ─── Seeded RNG (mulberry32) ──────────────────────────────────────────────────
// Layout de chispas fijo durante el ciclo de vida (se sortea una vez al montar).

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

function generateSparks(rand: () => number, count: number): Spark[] {
  return Array.from({ length: count }, (_, id) => {
    // Ángulo de disparo con sesgo hacia arriba/afuera.
    const dir = rand() * Math.PI * 2
    const dist = 10 + rand() * 26 // px
    const dx = Math.cos(dir) * dist
    const dy = Math.sin(dir) * dist - 6 // sesgo hacia arriba
    return {
      id,
      left: rand() * 100,
      top: 20 + rand() * 60,
      length: 5 + rand() * 8, // 5–13px
      angle: (Math.atan2(dy, dx) * 180) / Math.PI,
      dx,
      dy,
      duration: 0.35 + rand() * 0.5, // 0.35–0.85s
      delay: rand() * 2,
      repeatDelay: 0.6 + rand() * 2.4, // sporádico
    }
  })
}

// ─── Component ────────────────────────────────────────────────────────────────
//
// Capa de chispas amarillas, auto-contenida: no se suscribe a ningún store/query.
// El sorteo usa Math.random() (solo cliente) → se difiere a un useEffect
// post-montaje (SSR y la primera pasada de hidratación quedan sin chispas,
// evitando mismatch). Bajo prefers-reduced-motion no renderiza nada.

function NeonSparksComponent({ active = true, density = 'medium', className }: NeonSparksProps) {
  const reducedMotion = useReducedMotion()
  const seedRef = useRef<number | null>(null)
  const [sparks, setSparks] = useState<Spark[]>([])

  useEffect(() => {
    if (reducedMotion || !active) {
      setSparks([])
      return
    }
    if (seedRef.current === null) {
      seedRef.current = Math.floor(Math.random() * 2 ** 31)
    }
    setSparks(generateSparks(mulberry32(seedRef.current), DENSITY_COUNTS[density]))
  }, [density, reducedMotion, active])

  if (reducedMotion || !active) return null

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {sparks.map((spark) => (
        <motion.span
          key={spark.id}
          className="absolute rounded-full bg-semantic-warning"
          style={{
            left: `${spark.left}%`,
            top: `${spark.top}%`,
            width: 2,
            height: spark.length,
            rotate: spark.angle,
            boxShadow: '0 0 6px var(--color-warning)',
            willChange: 'transform, opacity',
          }}
          initial={{ x: 0, y: 0, opacity: 0 }}
          animate={{ x: spark.dx, y: spark.dy, opacity: [0, 1, 0] }}
          transition={{
            duration: spark.duration,
            delay: spark.delay,
            repeat: Infinity,
            repeatDelay: spark.repeatDelay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  )
}

export const NeonSparks = memo(NeonSparksComponent)
NeonSparks.displayName = 'NeonSparks'
