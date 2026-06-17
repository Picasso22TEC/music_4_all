'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'

import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
import { cn } from '@/shared/lib/cn'

// ─── Types ───────────────────────────────────────────────────────────────────

export type NeonTitleColor = 'cyan' | 'purple'

export interface NeonTitleProps {
  children: React.ReactNode
  color?: NeonTitleColor
  className?: string
}

interface NeonLetter {
  char: string
  key: string
  duration: number
  delay: number
}

// ─── Config (FRONTEND_VISION.md — "Login inmersivo") ─────────────────────────
// Referencia las CSS custom properties del design system (globals.css) en vez
// de hex sueltos — textShadow no tiene utilidad nativa en Tailwind.

const GLOW_COLOR: Record<NeonTitleColor, string> = {
  cyan:   'var(--color-teal-400)',
  purple: 'var(--color-synthwave-magenta)',
}

const NBSP = ' '

function buildGlow(colorVar: string): string {
  return `0 0 6px ${colorVar}, 0 0 16px ${colorVar}`
}

// Parpadeo orgánico — ciclo completo de 1.5–3s por letra (≤ 1 cambio/seg,
// muy por debajo del límite de 3 flashes/seg de WCAG 2.3.1).
function buildLetters(text: string): NeonLetter[] {
  return text.split('').map((char, index) => ({
    // Non-breaking space — un espacio literal dentro de un span inline-flex
    // colapsa a 0px de ancho.
    char: char === ' ' ? NBSP : char,
    key: `${index}-${char}`,
    duration: 1.5 + Math.random() * 1.5,
    delay: Math.random() * 2,
  }))
}

// ─── Component ────────────────────────────────────────────────────────────────
//
// Letrero neón decorativo — sustituye al NeonTitle legacy eliminado. Cada
// letra parpadea de forma independiente para simular un tubo de neón real.

export function NeonTitle({ children, color = 'purple', className }: NeonTitleProps) {
  const reducedMotion = useReducedMotion()
  const text = typeof children === 'string' ? children : String(children)

  const glowColor = GLOW_COLOR[color]
  const textShadow = buildGlow(glowColor)

  const letters = useMemo(() => buildLetters(text), [text])

  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex font-mono', className)}
      style={{ color: glowColor, textShadow }}
    >
      {letters.map((letter) =>
        reducedMotion ? (
          <span key={letter.key}>{letter.char}</span>
        ) : (
          <motion.span
            key={letter.key}
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{
              duration: letter.duration,
              delay: letter.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {letter.char}
          </motion.span>
        )
      )}
    </span>
  )
}
