'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'

import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
import { cn } from '@/shared/lib/cn'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NeonTitleProps {
  children: React.ReactNode
  className?: string
  /** Se dispara una vez cuando termina la secuencia de encendido (letrero fijo). */
  onIgnited?: () => void
}

interface NeonLetter {
  char: string
  key: string
  color: string
  igniteDelay: number
  flickerDuration: number
  flickerDelay: number
}

// ─── Config (FRONTEND_VISION.md §1.2-A — letrero "MUSIC 4 ALL") ──────────────
// Rampa cian→magenta con tokens del design system (globals.css). Cada letra
// tiene color sólido de un token, de modo que su opacity puede animarse de
// forma independiente (parpadeo/encendido por letra) y el text-shadow del glow
// se pinta correctamente — un bg-clip-text continuo dejaría las letras como
// "huecos" que no pueden parpadear individualmente.

const RAMP = [
  'var(--color-teal-300)', // cian
  'var(--color-synthwave-blue)', // azul eléctrico
  'var(--color-synthwave-magenta)', // magenta
] as const

// Encendido: las letras se prenden en orden salteado dentro de esta ventana.
// Se mantiene corto y el parpadeo es por letra (nunca el bloque entero a la
// vez) para respetar WCAG 2.3.1 (<= 3 destellos/seg, área/contraste acotados).
const IGNITE_START_DELAY = 0.5 // las chispas se ven antes de que encienda
const IGNITE_WINDOW = 1.8 // reparto de encendidos por letra
const IGNITE_BUZZ = 0.7 // duración del "zumbido" de encendido por letra

function buildGlow(colorVar: string): string {
  return `0 0 6px ${colorVar}, 0 0 16px ${colorVar}`
}

function colorFor(index: number, total: number): string {
  if (total <= 1) return RAMP[0]
  const t = index / (total - 1) // 0..1 a lo ancho de la palabra
  const band = Math.min(RAMP.length - 1, Math.floor(t * RAMP.length))
  return RAMP[band]
}

function buildLetters(text: string): NeonLetter[] {
  const total = text.length
  return text.split('').map((char, index) => ({
    // Espacios se conservan tal cual — el contenedor usa whitespace-pre para
    // que no colapsen (y el texto accesible sigue siendo "MUSIC 4 ALL").
    char,
    key: `${index}-${char}`,
    color: colorFor(index, total),
    igniteDelay: IGNITE_START_DELAY + Math.random() * IGNITE_WINDOW,
    flickerDuration: 1.5 + Math.random() * 1.5,
    flickerDelay: Math.random() * 2,
  }))
}

// ─── Component ────────────────────────────────────────────────────────────────
//
// Letrero de neón que se enciende letra por letra (salteado), con "zumbido" de
// arranque tipo tubo real, y luego queda en parpadeo orgánico. Puramente
// decorativo (aria-hidden). Bajo prefers-reduced-motion se muestra encendido
// fijo, sin secuencia ni parpadeo.

export function NeonTitle({ children, className, onIgnited }: NeonTitleProps) {
  const reducedMotion = useReducedMotion()
  const text = typeof children === 'string' ? children : String(children)

  const letters = useMemo(() => buildLetters(text), [text])

  // Fase de encendido → régimen. Con reduced-motion arranca ya "encendido".
  const [lit, setLit] = useState(false)

  useEffect(() => {
    if (reducedMotion) {
      setLit(true)
      onIgnited?.()
      return
    }
    const totalMs = (IGNITE_START_DELAY + IGNITE_WINDOW + IGNITE_BUZZ) * 1000
    const timer = window.setTimeout(() => {
      setLit(true)
      onIgnited?.()
    }, totalMs)
    return () => window.clearTimeout(timer)
    // onIgnited se asume estable; no re-arrancar la secuencia si cambia la ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion])

  return (
    <span
      aria-hidden="true"
      className={cn('inline-block whitespace-pre font-pixel', className)}
    >
      {letters.map((letter) => {
        const style = { color: letter.color, textShadow: buildGlow(letter.color) }

        if (reducedMotion) {
          return (
            <span key={letter.key} style={style}>
              {letter.char}
            </span>
          )
        }

        if (!lit) {
          // Encendido: parte apagada, zumba hasta prender en su igniteDelay.
          return (
            <motion.span
              key={letter.key}
              className="inline-block"
              style={style}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.3, 1, 0.6, 1] }}
              transition={{
                duration: IGNITE_BUZZ,
                delay: letter.igniteDelay,
                ease: 'easeInOut',
              }}
            >
              {letter.char}
            </motion.span>
          )
        }

        // Régimen: parpadeo orgánico e independiente por letra.
        return (
          <motion.span
            key={letter.key}
            className="inline-block"
            style={style}
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{
              duration: letter.flickerDuration,
              delay: letter.flickerDelay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {letter.char}
          </motion.span>
        )
      })}
    </span>
  )
}
