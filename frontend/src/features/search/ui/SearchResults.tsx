import { Skeleton } from '@/shared/ui/Skeleton'
import type { Album, ArtistResult } from '@/entities'

import { AlbumCard } from './AlbumCard'
import { ArtistCard } from './ArtistCard'
import { EmptyState } from './EmptyState'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SearchResultsProps {
  albums: Album[]
  artists?: ArtistResult[]
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
  artists = [],
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
  if (albums.length === 0 && artists.length === 0) {
    return <EmptyState variant="no-results" />
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ── Artists row — circular results, first (Spotify/Tidal affordance) ── */}
      {artists.length > 0 && (
        <section aria-label={`${artists.length} artist${artists.length !== 1 ? 's' : ''} found`}>
          <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-secondary">
            Artists
          </h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {artists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        </section>
      )}

      {/* ── Album grid ─────────────────────────────────────────────────────── */}
      {albums.length > 0 && (
        <AlbumGrid albums={albums} onOpenAlbum={onOpenAlbum} onDownloadAlbum={onDownloadAlbum} />
      )}
    </div>
  )
}

// ─── Album grid (extracted so the artists row can sit above it) ───────────────

function AlbumGrid({
  albums,
  onOpenAlbum,
  onDownloadAlbum,
}: Pick<SearchResultsProps, 'albums' | 'onOpenAlbum' | 'onDownloadAlbum'>) {
  return (
    <section
      aria-label={`${albums.length} album${albums.length !== 1 ? 's' : ''} found`}
      className="relative isolate"
    >
      {/* Retícula técnica decorativa tras las cards — isolate crea el stacking
          context para que -z-10 quede detrás del grid pero sobre el fondo */}
      <div
        aria-hidden="true"
        className="texture-grid pointer-events-none absolute -inset-3 -z-10 rounded-lg"
      />
      {/* Estantería de madera oscura (Fase 15) — tablones abstractos bajo la
          retícula: las vinyl cards "descansan" sobre estantes de la tienda */}
      <div
        aria-hidden="true"
        className="texture-shelf pointer-events-none absolute -inset-3 -z-20 rounded-lg"
      />
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
