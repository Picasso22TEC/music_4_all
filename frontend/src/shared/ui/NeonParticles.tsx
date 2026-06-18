'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
import { cn } from '@/shared/lib/cn'

// ─── Types ───────────────────────────────────────────────────────────────────

export type NeonParticlesDensity = 'low' | 'medium' | 'high'
export type NeonParticlesVariant = 'default' | 'login'

export interface NeonParticlesProps {
  density?: NeonParticlesDensity
  variant?: NeonParticlesVariant
}

type DustColor = 'teal' | 'purple' | 'amber'

interface DustParticle {
  id: number
  color: DustColor
  left: number
  size: number
  driftX: number
  riseVh: number
  duration: number
  delay: number
  peakOpacity: number
}

interface VinylParticle {
  id: number
  left: number
  size: number
  holeSize: number
  riseVh: number
  duration: number
  delay: number
  opacity: number
  spin: 1 | -1
}

// ─── Config (FRONTEND_VISION.md — "Sistema de partículas") ───────────────────

const DENSITY_COUNTS: Record<NeonParticlesDensity, { dust: number; vinyl: number }> = {
  low:    { dust: 10, vinyl: 3 },
  medium: { dust: 18, vinyl: 6 },
  high:   { dust: 28, vinyl: 10 },
}

// Pesos de color por variante — 'login' intensifica el púrpura (synthwave-magenta).
const COLOR_WEIGHTS: Record<NeonParticlesVariant, Array<[DustColor, number]>> = {
  default: [['teal', 0.45], ['purple', 0.3], ['amber', 0.25]],
  login:   [['teal', 0.3], ['purple', 0.5], ['amber', 0.2]],
}

const DUST_COLOR_CLASS: Record<DustColor, string> = {
  teal:   'bg-teal-400',
  purple: 'bg-synthwave-magenta',
  amber:  'bg-semantic-warning',
}

const REDUCED_MOTION_DUST_COUNT = 3

// ─── Seeded RNG (mulberry32) ──────────────────────────────────────────────────
// Garantiza que el layout de partículas quede fijo durante el ciclo de vida del
// componente (se sortea una sola vez por montaje en el useEffect, no en cada render).

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

function pickColor(rand: () => number, weights: Array<[DustColor, number]>): DustColor {
  const roll = rand()
  let acc = 0
  for (const [color, weight] of weights) {
    acc += weight
    if (roll <= acc) return color
  }
  return weights[0][0]
}

function generateDust(
  rand: () => number,
  count: number,
  variant: NeonParticlesVariant
): DustParticle[] {
  const weights = COLOR_WEIGHTS[variant]
  return Array.from({ length: count }, (_, id) => ({
    id,
    color: pickColor(rand, weights),
    left: rand() * 100,
    size: 2 + rand() * 4, // 2–6px
    driftX: (rand() - 0.5) * 24,
    riseVh: 30 + rand() * 50,
    duration: 10 + rand() * 14,
    delay: rand() * 10,
    peakOpacity: variant === 'login' ? 0.5 + rand() * 0.4 : 0.35 + rand() * 0.35,
  }))
}

function generateVinyls(rand: () => number, count: number): VinylParticle[] {
  return Array.from({ length: count }, (_, id) => {
    const size = 20 + rand() * 10 // 20–30px
    return {
      id,
      left: rand() * 100,
      size,
      holeSize: Math.min(6, Math.max(4, size * 0.18)),
      riseVh: 40 + rand() * 40,
      duration: 18 + rand() * 16,
      delay: rand() * 12,
      opacity: 0.08 + rand() * 0.07, // 0.08–0.15
      spin: rand() > 0.5 ? 1 : -1,
    }
  })
}

// ─── Sub-render: vinilo en miniatura ──────────────────────────────────────────
// Cuerpo negro + dos anillos concéntricos (surcos) + agujero central.

function VinylDisc({ size, holeSize }: { size: number; holeSize: number }) {
  return (
    <div
      className="relative rounded-full border-2 border-surface-rack bg-surface-void"
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-[18%] rounded-full border border-surface-rack/70" />
      <div className="absolute inset-[36%] rounded-full border border-surface-rack/50" />
      <div
        className="absolute rounded-full bg-surface-rack"
        style={{
          width: holeSize,
          height: holeSize,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
//
// Fondo decorativo puramente visual (Fase 2 — sistema de partículas). Auto-
// contenido: no se suscribe a ningún store/query, por lo que permanece estable
// cuando cambia downloads.store/auth.store en el árbol que lo envuelve.
//
// El sorteo de posiciones usa Math.random() y por tanto solo puede ejecutarse
// en el cliente: se difiere a un useEffect post-montaje. El primer render (SSR
// y la pasada de hidratación del cliente) no pinta partículas — ambos quedan
// en el mismo contenedor vacío, evitando el mismatch de hidratación.

function NeonParticlesComponent({
  density = 'medium',
  variant = 'default',
}: NeonParticlesProps) {
  const reducedMotion = useReducedMotion()

  // Seed aleatorio fijo por montaje — sorteado una sola vez en el cliente,
  // reutilizado si density/variant/reducedMotion cambian en re-renders.
  const seedRef = useRef<number | null>(null)

  const [{ dust, vinyls }, setParticles] = useState<{
    dust: DustParticle[]
    vinyls: VinylParticle[]
  }>({ dust: [], vinyls: [] })

  useEffect(() => {
    if (seedRef.current === null) {
      seedRef.current = Math.floor(Math.random() * 2 ** 31)
    }
    const rand = mulberry32(seedRef.current)

    if (reducedMotion) {
      setParticles({ dust: generateDust(rand, REDUCED_MOTION_DUST_COUNT, variant), vinyls: [] })
      return
    }

    const { dust: dustCount, vinyl: vinylCount } = DENSITY_COUNTS[density]
    setParticles({
      dust: generateDust(rand, dustCount, variant),
      vinyls: generateVinyls(rand, vinylCount),
    })
  }, [density, variant, reducedMotion])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {dust.map((particle) =>
        reducedMotion ? (
          <span
            key={`dust-${particle.id}`}
            className={cn('absolute rounded-full', DUST_COLOR_CLASS[particle.color])}
            style={{
              left: `${particle.left}%`,
              bottom: '20%',
              width: particle.size,
              height: particle.size,
              opacity: particle.peakOpacity,
            }}
          />
        ) : (
          <motion.span
            key={`dust-${particle.id}`}
            className={cn('absolute rounded-full', DUST_COLOR_CLASS[particle.color])}
            style={{
              left: `${particle.left}%`,
              bottom: 0,
              width: particle.size,
              height: particle.size,
              willChange: 'transform, opacity',
            }}
            initial={{ y: '0vh', x: 0, opacity: 0 }}
            animate={{
              y: `-${particle.riseVh}vh`,
              x: [0, particle.driftX, 0],
              opacity: [0, particle.peakOpacity, particle.peakOpacity, 0],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )
      )}

      {!reducedMotion &&
        vinyls.map((particle) => (
          <motion.div
            key={`vinyl-${particle.id}`}
            className="absolute"
            style={{
              left: `${particle.left}%`,
              bottom: 0,
              opacity: particle.opacity,
              willChange: 'transform',
            }}
            initial={{ y: '0vh', rotate: 0 }}
            animate={{ y: `-${particle.riseVh}vh`, rotate: 360 * particle.spin }}
            transition={{
              y: { duration: particle.duration, delay: particle.delay, repeat: Infinity, ease: 'linear' },
              rotate: { duration: particle.duration / 2, repeat: Infinity, ease: 'linear' },
            }}
          >
            <VinylDisc size={particle.size} holeSize={particle.holeSize} />
          </motion.div>
        ))}
    </div>
  )
}

export const NeonParticles = memo(NeonParticlesComponent)
NeonParticles.displayName = 'NeonParticles'
