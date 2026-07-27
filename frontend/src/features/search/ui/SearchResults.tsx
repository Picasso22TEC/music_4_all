import { cn } from '@/shared/lib/cn'
import { Skeleton } from '@/shared/ui/Skeleton'
import type { Album, ArtistResult, TopHit, Track } from '@/entities'

import { AlbumCard } from './AlbumCard'
import { ArtistCard } from './ArtistCard'
import { EmptyState } from './EmptyState'
import { TopResultCard } from './TopResultCard'
import { TrackResults } from './TrackResults'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SearchResultsProps {
  albums: Album[]
  artists?: ArtistResult[]
  tracks?: Track[]
  topHit?: TopHit | null
  loading?: boolean
  onDownloadAlbum?: (id: string) => void
  onPlayAlbum?: (id: string) => void
  /** Plays the found songs queue from the given index (songs list). */
  onPlayTrack?: (index: number) => void
  /** Plays a specific track (top result — may not be in the songs list). */
  onPlayTopTrack?: (track: Track) => void
  onDownloadTrack?: (track: Track) => void
}

// ─── Skeleton count (full row on all breakpoints) ─────────────────────────────
const SKELETON_COUNT = 10

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Tidal-style search results, organised in sections:
 *   1. Top result (best match) + Songs — side by side on desktop.
 *   2. Artists — circular cards.
 *   3. Albums — vinyl grid.
 *
 * States:
 *  - loading=true  → skeleton grid (no flash of content)
 *  - everything empty, loading=false → EmptyState 'no-results'
 *
 * NOTE: The 'initial' EmptyState variant is rendered by the parent (DashboardClient),
 * NOT by SearchResults. SearchResults is only mounted when an active search exists.
 */
export function SearchResults({
  albums,
  artists = [],
  tracks = [],
  topHit = null,
  loading = false,
  onDownloadAlbum,
  onPlayAlbum,
  onPlayTrack,
  onPlayTopTrack,
  onDownloadTrack,
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
  if (albums.length === 0 && artists.length === 0 && tracks.length === 0 && !topHit) {
    return <EmptyState variant="no-results" />
  }

  const showTracks = tracks.length > 0 && Boolean(onPlayTrack) && Boolean(onDownloadTrack)

  return (
    <div className="flex flex-col gap-8">
      {/* ── Top result + Songs — two columns on desktop (Tidal affordance) ── */}
      {/* items-start: sin él, la grid iguala la altura de ambas columnas a la de
          la lista de Songs (larga) y la card del Top result —flex items-center—
          se estira y su contenido queda flotando en el centro de una caja enorme. */}
      {topHit && (
        <div className={cn('grid gap-6', showTracks && 'lg:grid-cols-2 lg:items-start')}>
          <TopResultCard
            topHit={topHit}
            onPlayAlbum={onPlayAlbum}
            onDownloadAlbum={onDownloadAlbum}
            onPlayTrack={onPlayTopTrack}
            onDownloadTrack={onDownloadTrack}
          />
          {showTracks && (
            <TrackResults tracks={tracks} onPlay={onPlayTrack!} onDownload={onDownloadTrack!} />
          )}
        </div>
      )}

      {/* ── Songs full-width when there is no top result ─────────────────── */}
      {!topHit && showTracks && (
        <TrackResults tracks={tracks} onPlay={onPlayTrack!} onDownload={onDownloadTrack!} />
      )}

      {/* ── Artists row — circular results (Spotify/Tidal affordance) ─────── */}
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
      {albums.length > 0 && <AlbumGrid albums={albums} onDownloadAlbum={onDownloadAlbum} />}
    </div>
  )
}

// ─── Album grid (extracted so the artists row can sit above it) ───────────────

function AlbumGrid({
  albums,
  onDownloadAlbum,
}: Pick<SearchResultsProps, 'albums' | 'onDownloadAlbum'>) {
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
          <AlbumCard key={album.id} album={album} onDownload={onDownloadAlbum} />
        ))}
      </div>
    </section>
  )
}
