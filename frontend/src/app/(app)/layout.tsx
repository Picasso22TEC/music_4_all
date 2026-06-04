import type { ReactNode } from 'react'

// Authenticated layout shell — Phase 2 (Layout Shell) adds Sidebar, PlayerBar, DownloadPanel
// Server-side session validation requires RM-03 (httpOnly cookie)

export default function AppLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
