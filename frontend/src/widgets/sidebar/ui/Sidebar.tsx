'use client'

import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

import { SidebarContent } from './SidebarContent'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SidebarProps {
  /** Slot para la zona baja del sidebar (el Walkman). La capa app lo compone —
   *  el sidebar no importa el widget del player (FSD: sin cross-imports). */
  footer?: ReactNode
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Sidebar fijo de escritorio (>= lg). Bajo lg la navegación vive en el drawer
 * MobileNav (compuesto por la capa app vía AppHeader menuSlot). El contenido
 * (brand + items + sesión) es compartido: ver SidebarContent.
 */
export function Sidebar({ footer }: SidebarProps) {
  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        // Position — fixed full-height left panel (design-system layout §1.2)
        'fixed top-0 left-0 bottom-0 w-sidebar',
        // Stacking — z-sticky: 200 (design-system §1.5)
        'z-sticky',
        // Surface + separator — tinte teal profundo para contrastar con el
        // contenido en negro (rediseño 2026-07)
        'bg-surface-sidebar border-r border-subtle',
        // Layout
        'flex flex-col',
        // Responsive — hidden on mobile (<lg), visible on desktop (wireframes §8.2)
        'hidden lg:flex',
      )}
    >
      <SidebarContent />
      {footer}
    </nav>
  )
}
