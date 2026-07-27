import type { Album, ArtistResult, Track } from '@/entities'

import { AlbumCard } from './AlbumCard'
import { ArtistCard } from './ArtistCard'
import { TrackResults } from './TrackResults'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SearchRecommendationsProps {
  /** Parent album of a song top result (its cover + tracks). Null otherwise. */
  albumContext?: { album: Album; tracks: Track[] } | null
  /** Name of the seed artist (for the "More from…" heading). */
  artistName?: string
  /** Seed artist's own releases — "album recommendations". */
  moreFromArtist?: Album[]
  /** Artists similar to the seed — "artist recommendations". */
  similarArtists?: ArtistResult[]
  onDownloadAlbum?: (albumId: string) => void
  onPlayAlbum?: (albumId: string) => void
  /** Plays the album-context track list from the given index. */
  onPlayAlbumTrack?: (index: number) => void
  onDownloadTrack?: (track: Track) => void
}

// Presupuesto por sección para no alargar en exceso la página de búsqueda.
const MAX_ALBUM_TRACKS = 6
const MAX_MORE_ALBUMS = 6
const MAX_SIMILAR = 8

const HEADING = 'mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-secondary'

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Contextual sections shown below the primary search results (Fase 4, etapa B):
 *   1. "From the album" — the album a searched song belongs to, with its tracks.
 *   2. "More from <artist>" — the seed artist's own releases (album recs).
 *   3. "Fans also like" — artists similar to the seed (artist recs).
 *
 * Purely presentational: the data is fetched by the page (DashboardClient) from
 * the already-cached /albums/{id} and /artists/{id} endpoints and passed in.
 */
export function SearchRecommendations({
  albumContext = null,
  artistName = '',
  moreFromArtist = [],
  similarArtists = [],
  onDownloadAlbum,
  onPlayAlbum,
  onPlayAlbumTrack,
  onDownloadTrack,
}: SearchRecommendationsProps) {
  const hasAlbumContext = albumContext !== null && albumContext.tracks.length > 0
  const hasMore = moreFromArtist.length > 0
  const hasSimilar = similarArtists.length > 0

  if (!hasAlbumContext && !hasMore && !hasSimilar) return null

  return (
    <div className="flex flex-col gap-10">
      {/* ── 1. From the album (song top result) ─────────────────────────── */}
      {hasAlbumContext && (
        <section aria-label={`From the album ${albumContext!.album.title}`}>
          <h2 className={HEADING}>From the album · {albumContext!.album.title}</h2>
          {/* lg:items-start: evita que la columna del álbum se estire a la altura
              de la lista de tracks (misma trampa del Top result). */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="w-full sm:w-52 lg:shrink-0">
              <AlbumCard
                album={albumContext!.album}
                onDownload={onDownloadAlbum}
                onPlay={onPlayAlbum}
              />
            </div>
            <div className="flex-1">
              {onPlayAlbumTrack && onDownloadTrack && (
                <TrackResults
                  tracks={albumContext!.tracks}
                  heading="Tracks"
                  max={MAX_ALBUM_TRACKS}
                  onPlay={onPlayAlbumTrack}
                  onDownload={onDownloadTrack}
                />
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── 2. More from <artist> (album recommendations) ───────────────── */}
      {hasMore && (
        <section aria-label={artistName ? `More from ${artistName}` : 'More from this artist'}>
          <h2 className={HEADING}>{artistName ? `More from ${artistName}` : 'More releases'}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {moreFromArtist.slice(0, MAX_MORE_ALBUMS).map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                onDownload={onDownloadAlbum}
                onPlay={onPlayAlbum}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── 3. Fans also like (artist recommendations) ──────────────────── */}
      {hasSimilar && (
        <section aria-label="Fans also like">
          <h2 className={HEADING}>Fans also like</h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {similarArtists.slice(0, MAX_SIMILAR).map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
