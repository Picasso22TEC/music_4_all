'use client'

import { useCallback, useEffect, useState } from 'react'

import { useWindowWidth } from '@/shared/hooks'

export interface SidebarState {
  /** True when the mobile drawer is open (always false on desktop — the
   *  desktop sidebar is fixed and always visible via CSS `hidden lg:flex`). */
  isOpen: boolean
  /** True when viewport is below the lg breakpoint (< 1024px) */
  isMobile: boolean
  toggle: () => void
  open: () => void
  close: () => void
}

/** Breakpoint at which the sidebar transitions from drawer to fixed panel */
const LG_BREAKPOINT = 1024

/**
 * Estado del drawer de navegación móvil (MobileNav).
 * En escritorio el Sidebar es fijo (CSS) y este estado no aplica: al cruzar
 * el breakpoint hacia lg el drawer se cierra solo.
 */
export function useSidebarState(): SidebarState {
  const [isOpen, setIsOpen] = useState(false)
  const width    = useWindowWidth()
  const isMobile = width < LG_BREAKPOINT

  // El drawer solo existe bajo lg: si el viewport crece, se cierra.
  useEffect(() => {
    if (!isMobile) setIsOpen(false)
  }, [isMobile])

  // Callbacks estables — seguros como dependencias de efectos en consumidores.
  const toggle = useCallback(() => setIsOpen((v) => !v), [])
  const open   = useCallback(() => setIsOpen(true), [])
  const close  = useCallback(() => setIsOpen(false), [])

  return {
    isOpen: isMobile && isOpen,
    isMobile,
    toggle,
    open,
    close,
  }
}
