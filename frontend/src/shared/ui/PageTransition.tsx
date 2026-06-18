'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'

import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
import { cn } from '@/shared/lib/cn'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PageTransitionProps {
  children: ReactNode
}

type SparkColor = 'teal' | 'purple' | 'amber'

interface Spark {
  id: number
  top: number
  left: number
  color: SparkColor
}

// ─── Config (FRONTEND_VISION.md — "Transiciones") ────────────────────────────

const SPARK_COLOR_CLASS: Record<SparkColor, string> = {
  teal:   'bg-teal-400',
  purple: 'bg-synthwave-magenta',
  amber:  'bg-semantic-warning',
}

const SPARK_COLORS: SparkColor[] = ['teal', 'purple', 'amber']

// Posiciones fijas cerca de los bordes de la pantalla — puramente decorativo.
const EDGE_POSITIONS: ReadonlyArray<{ top: number; left: number }> = [
  { top: 5,  left: 6 },
  { top: 10, left: 93 },
  { top: 50, left: 2 },
  { top: 46, left: 97 },
  { top: 92, left: 12 },
  { top: 88, left: 86 },
]

// `routeKey` isn't used for positioning — it only exists so callers can key
// this off the current pathname and get a fresh set of sparks per navigation.
function buildSparks(routeKey: string): Spark[] {
  void routeKey
  const count = 4 + Math.floor(Math.random() * 3) // 4–6 chispas
  return Array.from({ length: count }, (_, id) => ({
    id,
    top: EDGE_POSITIONS[id % EDGE_POSITIONS.length].top,
    left: EDGE_POSITIONS[id % EDGE_POSITIONS.length].left,
    color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
  }))
}

// ─── Component ────────────────────────────────────────────────────────────────
//
// Transición entre páginas del dashboard (Fase 7 — última fase del rediseño
// visual). Vive DENTRO de <main>/AnimatedMain — el Shell (Sidebar, AppHeader,
// DownloadPanel, PlayerBar) se renderiza fuera de este árbol y nunca se
// desmonta al navegar, así que el WebSocket singleton de DownloadPanel no se
// ve afectado por estas transiciones.

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const reducedMotion = useReducedMotion()

  // buildSparks() usa Math.random(), que daría valores distintos en SSR vs cliente
  // y rompería la hidratación. Por eso se difiere a un useEffect post-montaje: el
  // primer render (SSR + pasada de hidratación) no pinta chispas — ambos quedan en
  // el mismo estado inicial vacío. Tras montar (y en cada cambio de ruta) se sortea
  // un set nuevo solo en el cliente.
  const [sparks, setSparks] = useState<Spark[]>([])

  useEffect(() => {
    setSparks(reducedMotion ? [] : buildSparks(pathname))
  }, [pathname, reducedMotion])

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {children}

        {/* Chispas neón — decorativas, fuera del flujo de layout */}
        {sparks.length > 0 && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-raised overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {sparks.map((spark) => (
              <span
                key={spark.id}
                className={cn('absolute h-1.5 w-1.5 rounded-full', SPARK_COLOR_CLASS[spark.color])}
                style={{ top: `${spark.top}%`, left: `${spark.left}%` }}
              />
            ))}
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
