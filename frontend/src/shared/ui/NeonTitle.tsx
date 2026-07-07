'use client'

import { useEffect } from 'react'
import { motion, useAnimationControls } from 'framer-motion'

import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
import { cn } from '@/shared/lib/cn'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NeonTitleProps {
  children: React.ReactNode
  className?: string
  /**
   * 'chaotic' — parpadeo caótico por letra (letrero del Login).
   * 'stable' — tubos encendidos fijos con glow, sin loops de animación
   *            (brand del Sidebar: visible en toda sesión, cero coste continuo).
   */
  variant?: 'chaotic' | 'stable'
}

// ─── Paleta (FRONTEND_VISION.md §1.2-A) — neón morado/rosa "moribundo" ───────
// Tubos hueco (color transparente + -webkit-text-stroke); el glow del text-shadow
// hace las veces de luz del tubo. Cada letra toma un color de la rampa por índice
// (determinista → sin mismatch de hidratación).

const TUBE_COLORS = [
  'var(--color-synthwave-magenta)', // magenta
  'var(--color-synthwave-pink)', // rosa
  'var(--color-queue)', // morado
] as const

function colorFor(index: number): string {
  return TUBE_COLORS[index % TUBE_COLORS.length]
}

function glowFor(color: string): string {
  // Glow neón multicapa; también aporta la "luz del tubo".
  return `0 0 4px ${color}, 0 0 10px ${color}, 0 0 22px ${color}`
}

// Luz base tenue y temblorosa — "la corriente no llega bien".
const BASE_DIM = 0.42
const BASE_BRIGHT = 0.8

const rand = (min: number, max: number): number => min + Math.random() * (max - min)
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

// ─── Letra individual — máquina de estados caótica e independiente ────────────
//
// Cada letra vive su propio ciclo desincronizado:
//   encendido con "falso contacto" (2 intentos débiles, al 3.º queda fija)
//   → base tenue temblorosa (hold aleatorio)
//   → "tic nervioso" (parpadeo rápido, dudando)
//   → apagón seco (aleatorio 1–5s)
//   → vuelta a encender con falso contacto…
// Puramente decorativa (aria-hidden). El destello es por letra (área pequeña,
// nunca el bloque completo) para respetar WCAG 2.3.1.

function NeonLetter({ char, color, index }: { char: string; color: string; index: number }) {
  const controls = useAnimationControls()
  const reducedMotion = useReducedMotion()
  const isSpace = char === ' '

  useEffect(() => {
    // Espacios: no tienen tubo ni ciclo de vida.
    if (isSpace) return

    // Reduced-motion: encendido fijo y estable, sin secuencia ni parpadeo.
    if (reducedMotion) {
      controls.set({ opacity: BASE_BRIGHT })
      return
    }

    let cancelled = false

    // Encendido por "falso contacto": intenta prender débil, se apaga, reintenta,
    // y al tercer intento se queda fija.
    async function falseContactIgnite(startFrom: number) {
      await controls.start({
        opacity: [startFrom, 0.35, 0],
        transition: { duration: 0.2, ease: 'linear' },
      })
      if (cancelled) return
      await wait(rand(90, 260))
      if (cancelled) return
      await controls.start({
        opacity: [0, 0.55, 0.08],
        transition: { duration: 0.2, ease: 'linear' },
      })
      if (cancelled) return
      await wait(rand(90, 300))
      if (cancelled) return
      await controls.start({
        opacity: [0.08, 1, BASE_BRIGHT],
        transition: { duration: 0.22, ease: 'easeOut' },
      })
    }

    async function life() {
      // Entrada escalonada (orden salteado por el índice + jitter) — el letrero
      // "forcejea" para encender.
      await wait(rand(80, 700) + index * 55)
      if (cancelled) return
      await falseContactIgnite(0)

      while (!cancelled) {
        // Base tenue temblorosa durante un hold aleatorio (corto → muere seguido).
        await controls.start({
          opacity: [BASE_BRIGHT, BASE_DIM, BASE_BRIGHT, BASE_DIM + 0.16, BASE_BRIGHT],
          transition: { duration: rand(1.1, 2.1), repeat: Math.round(rand(0, 2)), ease: 'easeInOut' },
        })
        if (cancelled) return

        // "Tic nervioso" — parpadeo rápido, como dudando, antes de morir.
        await controls.start({
          opacity: [BASE_BRIGHT, 0, 0.9, 0, 0.8, 0],
          transition: { duration: 0.3, ease: 'linear' },
        })
        if (cancelled) return

        // Apagón seco durante un tiempo aleatorio (~1–4.5s).
        await controls.start({ opacity: 0, transition: { duration: 0.03 } })
        await wait(rand(900, 4500))
        if (cancelled) return

        // Vuelve a la vida con falso contacto.
        await falseContactIgnite(0)
      }
    }

    void life()

    return () => {
      cancelled = true
      controls.stop()
    }
    // controls es estable; sólo re-arrancar si cambia reducedMotion/isSpace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, isSpace])

  // Espacios: sin tubo ni glow, pero se conserva el carácter (whitespace-pre)
  // para que el texto accesible del letrero siga siendo "MUSIC 4 ALL".
  if (isSpace) {
    return (
      <span aria-hidden="true" className="inline-block whitespace-pre">
        {char}
      </span>
    )
  }

  return (
    <motion.span
      aria-hidden="true"
      className="inline-block"
      initial={{ opacity: reducedMotion ? BASE_BRIGHT : 0 }}
      animate={controls}
      style={{
        color: 'transparent',
        WebkitTextStroke: `1px ${color}`,
        textShadow: glowFor(color),
      }}
    >
      {char}
    </motion.span>
  )
}

// ─── Letra estática — tubo encendido fijo, sin ciclo de vida ──────────────────
// Componente separado (no un condicional dentro de NeonLetter) para no
// condicionar hooks (rules of hooks). Sin framer: cero coste de animación.

function StaticNeonLetter({ char, color }: { char: string; color: string }) {
  if (char === ' ') {
    return (
      <span aria-hidden="true" className="inline-block whitespace-pre">
        {char}
      </span>
    )
  }

  return (
    <span
      aria-hidden="true"
      className="inline-block"
      style={{
        color: 'transparent',
        WebkitTextStroke: `1px ${color}`,
        textShadow: glowFor(color),
        opacity: BASE_BRIGHT,
      }}
    >
      {char}
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NeonTitle({ children, className, variant = 'chaotic' }: NeonTitleProps) {
  const text = typeof children === 'string' ? children : String(children)

  return (
    <span aria-hidden="true" className={cn('inline-block font-neon leading-none', className)}>
      {text.split('').map((char, index) =>
        variant === 'stable' ? (
          <StaticNeonLetter key={`${index}-${char}`} char={char} color={colorFor(index)} />
        ) : (
          <NeonLetter key={`${index}-${char}`} char={char} color={colorFor(index)} index={index} />
        ),
      )}
    </span>
  )
}
