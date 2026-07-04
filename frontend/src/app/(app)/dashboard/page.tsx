/**
 * Dashboard page — Server Component thin shell.
 *
 * Delegates all state and logic to DashboardClient (client boundary).
 * All legacy imports have been removed from this file.
 *
 * Eliminated dependencies (now in DashboardClient.tsx using v2 stack):
 *   -@/store/useAppStore    →  features/auth (auth.store v2)
 *   -@/lib/api              →  features/search, features/downloads
 *   -@/hooks/useWebSocket   →  (Phase 6E — WS unificado)
 *   -@/components/NeonTitle →  Layout Shell (sidebar brand)
 *   -@/components/VinylCard →  features/search/ui/AlbumCard (v2)
 *   -@/components/DownloadButton → shared/ui/Button
 *   -@/components/ProgressBar    → shared/ui/ProgressBar
 */
import DashboardClient from './DashboardClient'

export default function DashboardPage() {
  return <DashboardClient />
}
