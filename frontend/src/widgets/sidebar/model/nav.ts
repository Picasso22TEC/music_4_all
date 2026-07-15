import {
  Download,
  History,
  LayoutDashboard,
  Library,
  Settings,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ─── Navigation items (wireframes §15) ───────────────────────────────────────
// Única fuente de verdad de la navegación: la consumen el Sidebar de escritorio
// y el drawer móvil (MobileNav) a través de SidebarContent.

export const NAV_ITEMS: ReadonlyArray<{ href: string; label: string; Icon: LucideIcon }> = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/library',   label: 'Library',   Icon: Library },
  { href: '/downloads', label: 'Downloads', Icon: Download },
  { href: '/history',   label: 'History',   Icon: History },
  { href: '/settings',  label: 'Settings',  Icon: Settings },
] as const

// ─── Session dot color per status (wireframes §15 — bottom section) ──────────

export const SESSION_DOT: Record<string, string> = {
  authenticated:   'bg-semantic-success',
  expired:         'bg-semantic-warning',
  unauthenticated: 'bg-semantic-error',
}

export const SESSION_LABEL: Record<string, string> = {
  authenticated:   'Tidal',
  expired:         'EXPIRED',
  unauthenticated: 'OFFLINE',
}
