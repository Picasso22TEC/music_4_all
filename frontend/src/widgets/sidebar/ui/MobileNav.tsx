'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'

import { cn } from '@/shared/lib/cn'
import { useFocusTrap, useReducedMotion } from '@/shared/hooks'

import { useSidebarState } from '../model/useSidebarState'
import { SidebarContent } from './SidebarContent'
import { SidebarSession } from './SidebarSession'

// ─── Framer variants ──────────────────────────────────────────────────────────
// Transform string completo (no el shorthand x) — hardware accelerated.
// Curva de drawer tipo iOS; salida más rápida que la entrada (el usuario ya
// decidió irse). Bajo reduced-motion el desplazamiento se sustituye por fade.

const DRAWER_EASE = [0.32, 0.72, 0, 1] as const

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Drawer de navegación móvil (< lg) — UX-03.
 * Reutiliza SidebarContent (misma navegación que el Sidebar de escritorio).
 * El trigger vive en el AppHeader vía menuSlot; la capa app compone ambos
 * widgets sin cross-imports (FSD).
 *
 * La AnimatePresence es LOCAL a este componente: jamás envuelve el shell
 * ni el DownloadPanel (WS singleton).
 */
export function MobileNav() {
  const pathname      = usePathname()
  const reducedMotion = useReducedMotion()
  const { isOpen, toggle, close } = useSidebarState()
  const panelRef = useRef<HTMLDivElement>(null)

  // Cerrar al navegar (el cambio de ruta llega después del click en un Link).
  useEffect(() => {
    close()
  }, [pathname, close])

  // Escape cierra.
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, close])

  // Scroll-lock del fondo mientras el drawer está abierto.
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Devolver el foco al trigger al cerrar (mismo patrón que Modal).
  useEffect(() => {
    if (!isOpen) return
    const prev = document.activeElement as HTMLElement | null
    return () => {
      prev?.focus()
    }
  }, [isOpen])

  // Ciclo de foco dentro del panel.
  useFocusTrap(panelRef, isOpen)

  return (
    <div className="lg:hidden">
      {/* ── Trigger ────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={toggle}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        className={cn(
          'inline-flex items-center justify-center rounded-md p-1.5',
          'text-secondary hover:text-primary transition-colors duration-100',
          'focus-visible:outline-none focus-visible:shadow-glow-focus',
        )}
      >
        <Menu aria-hidden="true" className="h-5 w-5" />
      </button>

      {/* ── Drawer ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop — mismo tratamiento que Modal (bg-surface-void/80) */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.2 } }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              aria-hidden="true"
              onClick={close}
              className="fixed inset-0 z-overlay bg-surface-void/80"
            />

            {/* Panel */}
            <motion.div
              key="panel"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              initial={reducedMotion ? { opacity: 0 } : { transform: 'translateX(-100%)' }}
              animate={
                reducedMotion
                  ? { opacity: 1, transition: { duration: 0.2 } }
                  : { transform: 'translateX(0%)', transition: { duration: 0.3, ease: DRAWER_EASE } }
              }
              exit={
                reducedMotion
                  ? { opacity: 0, transition: { duration: 0.15 } }
                  : { transform: 'translateX(-100%)', transition: { duration: 0.2, ease: DRAWER_EASE } }
              }
              className={cn(
                'fixed inset-y-0 left-0 w-sidebar z-modal',
                'bg-surface-sidebar border-r border-subtle',
                'flex flex-col',
              )}
            >
              {/* Botón de cierre explícito, sobre el brand */}
              <button
                type="button"
                onClick={close}
                aria-label="Close navigation menu"
                className={cn(
                  'absolute right-2 top-4 z-raised inline-flex items-center justify-center rounded-md p-1.5',
                  'text-secondary hover:text-primary transition-colors duration-100',
                  'focus-visible:outline-none focus-visible:shadow-glow-focus',
                )}
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>

              {/* aria-label distinto al del Sidebar de escritorio para no
                  duplicar landmarks con el mismo nombre */}
              <nav aria-label="Mobile navigation" className="flex min-h-0 flex-1 flex-col">
                <SidebarContent onNavigate={close} />
                <SidebarSession />
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
