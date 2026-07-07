'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

import { useReducedMotion } from '@/shared/hooks'
import { NeonArcs } from '@/shared/ui'

import { useAuthTransitionStore } from '../model/auth-transition.store'

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Overlay one-shot de la transición Login → Dashboard: flash radial teal +
 * chispas NeonArcs durante ~650ms, montado en el root layout (por encima de
 * los grupos (auth) y (app)) para enmascarar el swap entre layouts.
 *
 * - Se suscribe SOLO a auth-transition.store (requestId) — desacoplado de
 *   auth.store: sin flashes falsos en recovery de sesión ni en rehidratación.
 * - pointer-events-none + aria-hidden: nunca bloquea la navegación, que corre
 *   en paralelo (router.replace no se retrasa).
 * - Un solo destello por evento (WCAG 2.3.1). Bajo prefers-reduced-motion no
 *   se renderiza nada.
 */
export function AuthTransitionOverlay() {
  const requestId     = useAuthTransitionStore((s) => s.requestId)
  const reducedMotion = useReducedMotion()
  const [activeId, setActiveId] = useState<number | null>(null)

  useEffect(() => {
    // requestId 0 = ninguna transición solicitada todavía.
    if (requestId === 0 || reducedMotion) return
    setActiveId(requestId)
  }, [requestId, reducedMotion])

  if (activeId === null) return null

  return (
    <motion.div
      key={activeId}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-toast"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.7, 0] }}
      transition={{ duration: 0.65, times: [0, 0.25, 1], ease: 'easeOut' }}
      onAnimationComplete={() => setActiveId(null)}
    >
      {/* Flash radial — centro casi blanco con halo teal (solo tokens) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, var(--color-text-primary) 0%, var(--color-teal-400) 22%, transparent 65%)',
        }}
      />
      {/* Chispas de "apertura de puerta" mientras el overlay vive */}
      <NeonArcs density="high" className="absolute inset-0" />
    </motion.div>
  )
}
