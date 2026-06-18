import type { ReactNode } from 'react'

import { SessionRecoveryModal } from '@/features/auth'
import { AppHeader } from '@/widgets/app-header'
import { DownloadPanel } from '@/widgets/download-panel'
import { PlayerBar } from '@/widgets/player-bar'
import { Sidebar } from '@/widgets/sidebar'

import { AnimatedMain } from './AnimatedMain'

/**
 * Authenticated application shell (wireframes §2 — Shell v2).
 *
 * Layout structure:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Sidebar (fixed left, w-sidebar, hidden on mobile)          │
 * ├─────────────┬───────────────────────────────────────────────┤
 * │             │ AppHeader (sticky, h-header)                  │
 * │             ├───────────────────────────────────────────────┤
 * │             │ Page content (flex-1, overflow-y-auto)        │
 * │             │                                               │
 * ├─────────────┴───────────────────────────────────────────────┤
 * │ PlayerBar (fixed bottom, h-player, z-sticky)               │
 * └─────────────────────────────────────────────────────────────┘
 *
 * NOTE: RM-03 will add server-side session validation here once
 * the backend emits httpOnly session cookies.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-surface-void">

      {/* Skip-to-content link (accessibility — spec §5) */}
      <a
        href="#main-content"
        className={[
          'sr-only focus:not-sr-only',
          'focus:absolute focus:top-2 focus:left-2',
          'focus:z-tooltip focus:rounded-md',
          'focus:bg-teal-500 focus:px-4 focus:py-2',
          'focus:font-sans focus:text-sm focus:font-medium focus:text-surface-void',
        ].join(' ')}
      >
        Skip to main content
      </a>

      {/* ── Sidebar — fixed left panel ────────────────────────────── */}
      <Sidebar />

      {/* ── Main column — offset by sidebar on lg+ ────────────────── */}
      {/*  lg:ml-60 = 240px = w-sidebar (16 × 15 = 240px in Tailwind) */}
      <div className="flex h-full flex-col overflow-hidden lg:ml-60">

        {/* Sticky header */}
        <AppHeader />

        {/* Scrollable page content — client boundary, owns page transitions (Fase 7) */}
        {/*  pb-20 = 80px = h-player, clears the fixed PlayerBar */}
        <AnimatedMain>{children}</AnimatedMain>
      </div>

      {/* ── Session Recovery Modal — auth error recovery (G-recovery) ─── */}
      {/*  Always present so openSessionRecovery() works from anywhere.   */}
      <SessionRecoveryModal />

      {/* ── Download panel — fixed above PlayerBar ────────────────────── */}
      {/*  Always mounted so the WS socket stays alive for the session.  */}
      {/*  Renders nothing when isPanelVisible=false.                    */}
      <DownloadPanel />

      {/* ── Player bar — fixed bottom ──────────────────────────────── */}
      {/*  Rendered outside the column so it spans full viewport width */}
      <PlayerBar />

    </div>
  )
}
