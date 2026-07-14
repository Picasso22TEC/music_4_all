'use client'

import { usePathname } from 'next/navigation'

import { cn } from '@/shared/lib/cn'
import { Badge } from '@/shared/ui/Badge'
import type { BadgeVariant } from '@/shared/ui/Badge'
import { useAuthStore } from '@/features/auth'

// ─── Page title map ───────────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/library':   'Library',
  '/downloads': 'Downloads',
  '/history':   'History',
  '/settings':  'Settings',
}

// ─── Session badge config ─────────────────────────────────────────────────────
// Label max 8 chars (design-system §3.6)

interface SessionBadgeConfig {
  variant: Extract<BadgeVariant, 'status-ok' | 'status-warn' | 'status-error'>
  label: string
}

const SESSION_BADGE: Record<string, SessionBadgeConfig> = {
  authenticated:   { variant: 'status-ok',    label: 'HIFI' },
  expired:         { variant: 'status-warn',  label: 'EXPIRED' },
  unauthenticated: { variant: 'status-error', label: 'OFFLINE' },
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AppHeaderProps {
  /** Slot para el trigger de navegación móvil (MobileNav). La capa app compone
   *  ambos widgets — AppHeader no importa nada del sidebar (FSD: sin
   *  cross-imports entre widgets). */
  menuSlot?: React.ReactNode
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppHeader({ menuSlot }: AppHeaderProps) {
  const pathname   = usePathname() ?? ''
  const status     = useAuthStore((s) => s.status)

  // Resolve page title — fallback to app name
  const pageTitle = PAGE_TITLES[pathname] ?? 'Music 4 All'

  // Resolve badge config — fallback to offline
  const badge = SESSION_BADGE[status] ?? SESSION_BADGE.unauthenticated

  return (
    <header
      className={cn(
        // Sticky at top of the scrolling column (z-raised: 10)
        'sticky top-0 z-raised shrink-0',
        // Surface + separator
        'bg-surface-void border-b border-subtle',
        // Layout
        'flex items-center justify-between',
        // Size — uses h-header token (56px, design-system §1.2)
        'h-header px-6',
      )}
    >
      {/* Left: mobile menu trigger (only < lg) + dynamic page title */}
      <div className="flex items-center gap-2">
        {menuSlot}
        <h1 className="font-mono text-lg font-semibold leading-none text-primary">
          {pageTitle}
        </h1>
      </div>

      {/* Right: Tidal session status */}
      <div className="flex items-center gap-3" role="group" aria-label="Session status">
        <Badge
          variant={badge.variant}
          dot
          title={`Tidal session status: ${status}`}
        >
          {badge.label}
        </Badge>
      </div>
    </header>
  )
}
