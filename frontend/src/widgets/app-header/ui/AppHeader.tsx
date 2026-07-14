'use client'

import { usePathname, useRouter } from 'next/navigation'

import { cn } from '@/shared/lib/cn'
import { Badge } from '@/shared/ui/Badge'
import type { BadgeVariant } from '@/shared/ui/Badge'
import { useAuthStore } from '@/features/auth'
import { SearchInput, useSearchStore } from '@/features/search'

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
  const router     = useRouter()
  const status     = useAuthStore((s) => s.status)

  // Global search — the single app-wide search entry point (A2/A4).
  const query    = useSearchStore((s) => s.query)
  const setQuery = useSearchStore((s) => s.setQuery)

  // Typing from any other page jumps to the dashboard, where results render.
  function handleSearchChange(value: string) {
    setQuery(value)
    if (pathname !== '/dashboard') router.push('/dashboard')
  }

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
      {/* Left: mobile menu trigger (only < lg). El nombre de la app vive en el
          cartel neón del sidebar; no se repite aquí (evita redundancia). */}
      {menuSlot && <div className="flex shrink-0 items-center">{menuSlot}</div>}

      {/* Center: global search — present on every app page (A2/A4) */}
      <div className="mx-3 max-w-lg flex-1 sm:mx-4">
        <SearchInput value={query} onChange={handleSearchChange} />
      </div>

      {/* Right: Tidal session status */}
      <div className="flex shrink-0 items-center gap-3" role="group" aria-label="Session status">
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
