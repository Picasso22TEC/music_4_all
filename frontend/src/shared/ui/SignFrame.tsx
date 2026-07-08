'use client'

import { memo } from 'react'

import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
import { cn } from '@/shared/lib/cn'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SignFrameProps {
  /** Contenido del letrero (decorativo — el nombre accesible debe vivir fuera). */
  children: React.ReactNode
  className?: string
  /**
   * `true` (por defecto, Sidebar): dibuja la placa metálica (borde + fondo) con
   * remaches alrededor del contenido.
   * `false` (Login): solo cuelga las cadenas y pone remaches en las esquinas —
   * el propio contenido aporta su marco (el letrero de neón ya lleva su borde).
   */
  plate?: boolean
  /** Utilidades de tamaño para las cadenas colgantes (alto/ancho). */
  chainClassName?: string
}

// ─── Config ───────────────────────────────────────────────────────────────────
// Remaches en las cuatro esquinas. En modo placa van pegados al borde; en modo
// "sin placa" se meten hacia dentro para caer sobre el marco del propio letrero.

const RIVETS_PLATE = [
  'left-0.5 top-0.5',
  'right-0.5 top-0.5',
  'bottom-0.5 left-0.5',
  'bottom-0.5 right-0.5',
] as const

const RIVETS_BARE = [
  'left-2 top-2',
  'right-2 top-2',
  'bottom-2 left-2',
  'bottom-2 right-2',
] as const

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Marco del letrero — placa metálica con remaches colgada de dos cadenas, como
 * si el letrero pendiera físicamente del techo de la tienda. Se usa tanto en el
 * brand del Sidebar (modo placa) como en el letrero grande del Login
 * (`plate={false}`: solo cadenas + remaches sobre su marco neón).
 *
 * Escena decorativa (Fase 15, DESIGN_SYSTEM_VISION §11): aria-hidden,
 * pointer-events-none, sin stores ni WebSocket. Formas planas abstractas con
 * tokens existentes (border DEFAULT + ghost + surface-console) y sin glow
 * propio — el acento synthwave de la vista sigue siendo el NeonTitle.
 *
 * El balanceo pendular (animate-sign-sway, solo rotate con origen en las
 * cadenas) se omite bajo prefers-reduced-motion: placa colgada estática.
 */
export const SignFrame = memo(function SignFrame({
  children,
  className,
  plate = true,
  chainClassName,
}: SignFrameProps) {
  const reducedMotion = useReducedMotion()
  const rivets = plate ? RIVETS_PLATE : RIVETS_BARE
  const rivetSize = plate ? 'h-0.5 w-0.5' : 'h-1 w-1'
  // El Login vive sobre negro absoluto: ghost queda invisible, así que el metal
  // se aclara a `disabled`. El Sidebar (surface-abyss) mantiene ghost, más sutil.
  const chainBorder = plate ? 'border-ghost/80' : 'border-disabled'
  const rivetBg = plate ? 'bg-ghost' : 'bg-disabled'

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none inline-flex select-none flex-col items-center',
        !reducedMotion && 'origin-top animate-sign-sway',
        className,
      )}
    >
      {/* Cadenas — dos líneas discontinuas (eslabones abstractos). Se estiran al
          alto del contenedor (align-items: stretch); su tamaño lo fija
          chainClassName (flex-1 para rellenar en el Sidebar, alto fijo en Login). */}
      <div className={cn('flex justify-between', chainClassName ?? 'min-h-2 w-3/4 flex-1')}>
        <span className={cn('w-px border-l border-dashed', chainBorder)} />
        <span className={cn('w-px border-l border-dashed', chainBorder)} />
      </div>

      {plate ? (
        /* Placa — marco metálico plano con remaches en las esquinas. */
        <div className="relative rounded-sm border bg-surface-console/50 px-2.5 py-1">
          {rivets.map((pos) => (
            <span key={pos} className={cn('absolute rounded-full', rivetBg, rivetSize, pos)} />
          ))}
          {children}
        </div>
      ) : (
        /* Sin placa — el letrero trae su marco; solo añadimos los remaches. */
        <div className="relative inline-block">
          {rivets.map((pos) => (
            <span
              key={pos}
              className={cn('absolute z-raised rounded-full', rivetBg, rivetSize, pos)}
            />
          ))}
          {children}
        </div>
      )}
    </div>
  )
})
