'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Disc3,
  Download,
  History,
  LayoutDashboard,
  Library,
  Settings,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/shared/lib/cn'
import { useAuthStore } from '@/features/auth'

// ─── Navigation items (wireframes §15) ───────────────────────────────────────

const NAV_ITEMS: ReadonlyArray<{ href: string; label: string; Icon: LucideIcon }> = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/library',   label: 'Library',   Icon: Library },
  { href: '/downloads', label: 'Downloads', Icon: Download },
  { href: '/history',   label: 'History',   Icon: History },
  { href: '/settings',  label: 'Settings',  Icon: Settings },
] as const

// ─── Session dot color per status (wireframes §15 — bottom section) ──────────

const SESSION_DOT: Record<string, string> = {
  authenticated:   'bg-semantic-success',
  expired:         'bg-semantic-warning',
  unauthenticated: 'bg-semantic-error',
}

const SESSION_LABEL: Record<string, string> = {
  authenticated:   'TIDAL HIFI',
  expired:         'EXPIRED',
  unauthenticated: 'OFFLINE',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname() ?? ''
  const status   = useAuthStore((s) => s.status)
  const user     = useAuthStore((s) => s.user)

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        // Position — fixed full-height left panel (design-system layout §1.2)
        'fixed top-0 left-0 bottom-0 w-sidebar',
        // Stacking — z-sticky: 200 (design-system §1.5)
        'z-sticky',
        // Surface + separator (tokens from Phase 3.5)
        'bg-surface-abyss border-r border-subtle',
        // Layout
        'flex flex-col',
        // Responsive — hidden on mobile (<lg), visible on desktop (wireframes §8.2)
        'hidden lg:flex',
      )}
    >
      {/* ── Brand ─────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-subtle px-4 h-header">
        <Disc3 aria-hidden="true" className="h-4 w-4 text-teal-500" />
        <span className="select-none font-mono text-sm font-bold tracking-widest text-teal-500">
          MUSIC 4 ALL
        </span>
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

      {/* ── Session status (wireframes §15 — bottom section) ──────────── */}
      <div className="shrink-0 border-t border-subtle px-4 py-3 space-y-1">
        {/* Connection dot + label */}
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              'inline-block h-1.5 w-1.5 rounded-full',
              SESSION_DOT[status] ?? 'bg-disabled',
            )}
          />
          <span className="font-mono text-2xs font-medium uppercase text-secondary">
            {SESSION_LABEL[status] ?? 'OFFLINE'}
          </span>
        </div>

        {/* User email (when authenticated) */}
        {user?.email && (
          <p className="truncate pl-3.5 font-sans text-xs text-disabled">
            {user.email}
          </p>
        )}
      </div>
    </nav>
  )
}
