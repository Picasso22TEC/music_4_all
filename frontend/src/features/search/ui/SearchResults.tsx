import { Skeleton } from '@/shared/ui/Skeleton'
import type { Album } from '@/entities'

import { AlbumCard } from './AlbumCard'
import { EmptyState } from './EmptyState'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SearchResultsProps {
  albums: Album[]
  loading?: boolean
  onOpenAlbum?: (id: string) => void
  onDownloadAlbum?: (id: string) => void
}

// ─── Skeleton count (full row on all breakpoints) ─────────────────────────────
const SKELETON_COUNT = 10

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Renders a responsive grid of AlbumCard v2.
 *
 * States:
 *  - loading=true  → skeleton grid (no flash of content)
 *  - albums.length === 0, loading=false → EmptyState 'no-results'
 *  - albums.length > 0  → album grid
 *
 * NOTE: The 'initial' EmptyState variant is rendered by the parent (DashboardClient),
 * NOT by SearchResults. SearchResults is only mounted when an active search exists.
 */
export function SearchResults({
  albums,
  loading = false,
  onOpenAlbum,
  onDownloadAlbum,
}: SearchResultsProps) {
  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading search results"
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      >
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2" aria-hidden="true">
            <Skeleton className="aspect-square w-full rounded-md" />
            <Skeleton variant="text" className="h-4 w-3/4" />
            <Skeleton variant="text" className="h-3 w-1/2" />
            <Skeleton variant="text" className="h-3 w-1/4" />
          </div>
        ))}
      </div>
    )
  }

  // ── Empty results ───────────────────────────────────────────────────────────
  if (albums.length === 0) {
    return <EmptyState variant="no-results" />
  }

  // ── Album grid ──────────────────────────────────────────────────────────────
  return (
    <section
      aria-label={`${albums.length} album${albums.length !== 1 ? 's' : ''} found`}
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {albums.map((album) => (
          <AlbumCard
            key={album.id}
            album={album}
            onOpen={onOpenAlbum}
            onDownload={onDownloadAlbum}
          />
        ))}
      </div>
    </section>
  )
}
