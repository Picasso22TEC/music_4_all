'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Disc3 } from 'lucide-react'

import { cn } from '@/shared/lib/cn'
import { NeonTitle, SignFrame } from '@/shared/ui'

import { NAV_ITEMS } from '../model/nav'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SidebarContentProps {
  /** Invocado al hacer click en un item de navegación (el drawer móvil lo usa
   *  para cerrarse); el Sidebar de escritorio no lo pasa. */
  onNavigate?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Contenido compartido de la navegación: brand + items + estado de sesión.
 * Lo montan el Sidebar fijo de escritorio y el drawer móvil (MobileNav) —
 * única fuente de verdad, sin duplicar NAV_ITEMS.
 */
export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const pathname = usePathname() ?? ''

  return (
    <>
      {/* ── Brand — el letrero de la tienda visto desde dentro ─────────────
          NeonTitle stable: mismos tubos morado/rosa del Login, encendido fijo
          (sin parpadeo — visible en toda sesión). SignFrame (Fase 15) lo cuelga
          de cadenas en una placa con remaches. Ambos son aria-hidden: el span
          sr-only preserva el nombre accesible del brand. */}
      <div className="flex shrink-0 items-center gap-2 border-b border-subtle px-4 h-header">
        <Disc3 aria-hidden="true" className="h-4 w-4 shrink-0 text-teal-500" />
        <SignFrame className="h-full pb-1.5">
          <NeonTitle variant="stable" className="select-none text-sm tracking-wide">
            MUSIC 4 ALL
          </NeonTitle>
        </SignFrame>
        <span className="sr-only">MUSIC 4 ALL</span>
      </div>

      {/* ── Navigation list ────────────────────────────────────────────── */}
      <ul
        role="list"
        className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5"
      >
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          // Active: exact match or starts with href/ (sub-routes)
          const isActive =
            pathname === href || pathname.startsWith(`${href}/`)

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm',
                  'transition-colors duration-100 ease-out',
                  'focus-visible:outline-none focus-visible:shadow-glow-focus',
                  // Active state (wireframes §15: surface-rack + teal-500 left border 2px)
                  isActive
                    ? 'bg-surface-rack text-primary font-medium border-l-2 border-l-teal-500'
                    : 'border-l-2 border-l-transparent text-secondary hover:bg-surface-console hover:text-primary',
                )}
              >
                <Icon
                  size={16}
                  aria-hidden="true"
                  className={cn(
                    'shrink-0 transition-colors duration-100',
                    isActive ? 'text-teal-500' : 'text-secondary',
                  )}
                />
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
