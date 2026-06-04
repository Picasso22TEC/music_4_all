'use client'

import { useState } from 'react'

import { useWindowWidth } from '@/shared/hooks'

export interface SidebarState {
  /** True when sidebar is open (always false on mobile — drawer not yet implemented) */
  isOpen: boolean
  /** True when viewport is below the lg breakpoint (< 1024px) */
  isMobile: boolean
  toggle: () => void
  open: () => void
  close: () => void
}

/** Breakpoint at which the sidebar transitions from hidden to visible */
const LG_BREAKPOINT = 1024

export function useSidebarState(): SidebarState {
  const [isOpen, setIsOpen] = useState(true)
  const width    = useWindowWidth()
  const isMobile = width < LG_BREAKPOINT

  return {
    // On mobile, sidebar is always closed (drawer implementation is Phase 2+)
    isOpen: isMobile ? false : isOpen,
    isMobile,
    toggle: () => setIsOpen((v) => !v),
    open:   () => setIsOpen(true),
    close:  () => setIsOpen(false),
  }
}
