'use client'

import type { ReactNode } from 'react'

import { NeonParticles } from '@/shared/ui/NeonParticles'
import { PageTransition } from '@/shared/ui/PageTransition'

export interface AnimatedMainProps {
  children: ReactNode
}

/**
 * Client boundary for the scrollable page content (Fase 7).
 *
 * Owns ONLY <main> + its decorative background + the page-transition layer.
 * Sidebar/AppHeader/DownloadPanel/PlayerBar are rendered by the (server)
 * AppLayout OUTSIDE this component, so they never unmount/remount when
 * `usePathname()` changes inside PageTransition — the DownloadPanel WebSocket
 * singleton stays alive across navigation.
 */
export function AnimatedMain({ children }: AnimatedMainProps) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-1 overflow-y-auto pb-20 focus-visible:outline-none"
    >
      {/* Decorative background — purely visual, isolated from downloads.store/auth.store */}
      <div className="relative min-h-full">
        <NeonParticles variant="default" density="low" />
        <PageTransition>{children}</PageTransition>
      </div>
    </main>
  )
}
