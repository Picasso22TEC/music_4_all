'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play } from 'lucide-react'

import type { Album, ArtistResult, AudioQuality } from '@/entities'
import { isValidTidalUrl } from '@/shared/lib/url.utils'
import { usePlayerStore, trackToPlayerTrack as toPlayerTrack } from '@/features/player'
import {
  AudioWaves,
  Button,
  CassetteStack,
  Modal,
  PottedPlant,
  QualitySelector,
  Turntable,
  VintageSpeaker,
} from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

import { useAuthStore } from '@/features/auth'
import {
  EmptyState,
  SearchInput,
  SearchResults,
  useResolveUrlQuery,
  useSearchQuery,
} from '@/features/search'
import { useStartDownloadMutation, useDownloadsStore } from '@/features/downloads'
import { useAlbumDetailQuery } from '@/features/album-detail'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Dashboard client boundary — v2 stack only.
 *
 * Auth:     useAuthStore v2 (status: SessionStatus)
 * Search:   useSearchQuery (text) | useResolveUrlQuery (Tidal URL)
 * Download: useStartDownloadMutation → POST /downloads {albumId, quality}
 *
 * NO imports from: store/useAppStore · lib/api · hooks/useWebSocket · components/*
 */
export default function DashboardClient() {
  const router = useRouter()

  // ── Auth v2 — redirect when not authenticated ───────────────────────────────
  const status = useAuthStore((s) => s.status)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)

  useEffect(() => {
    // Wait for the persisted session to rehydrate — `status` defaults to
    // 'unauthenticated' before then, which would otherwise bounce an
    // already-authenticated user to /login and back.
    if (!hasHydrated) return
    if (status === 'expired' || status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, hasHydrated, router])

  // ── Search state ────────────────────────────────────────────────────────────
  const [query,   setQuery]   = useState('')
  const [quality, setQuality] = useState<AudioQuality>('MASTER')

  const trimmed  = query.trim()
  const isUrl    = trimmed.length > 0 && isValidTidalUrl(trimmed)
  const hasQuery = trimmed.length >= 2   // minimum for text search

  // ── Queries — one active at a time ─────────────────────────────────────────

  // Text search: enabled when non-URL, ≥ 2 chars (useSearchQuery enforces enabled rule)
  const textQuery = useSearchQuery(isUrl ? '' : trimmed)

  // URL resolve: enabled when valid Tidal URL
  const urlQuery  = useResolveUrlQuery(isUrl ? trimmed : null)

  // Active query (drives all loading/error/data state)
  const activeQuery = isUrl ? urlQuery : textQuery

  // ── Albums derived from active query ────────────────────────────────────────

  const albums = useMemo<Album[]>(() => {
    // Nothing to derive when there is no active search
    if (!hasQuery && !isUrl) return []

    if (isUrl) {
      const result = urlQuery.data
      if (!result) return []
      if (result.type === 'album') {
        // Safe assertion: result.type === 'album' guarantees result.data is Album.
        // ResolveUrlResult.data is Album | Track | Playlist (non-discriminated union).
        return [result.data as Album]
      }
      // Tracks and playlists are not shown in the album grid yet (Phase 6C)
      return []
    }

    // Text search: extract album list from paginated results.
    // .slice() converts readonly Album[] → Album[] (mutable copy required by SearchResults)
    return textQuery.data?.albums.items.slice() ?? []
  }, [hasQuery, isUrl, urlQuery.data, textQuery.data])

  // Artists derived from a text search (URL resolve has no artist results).
  const artists = useMemo<ArtistResult[]>(
    () => (isUrl ? [] : (textQuery.data?.artists.items.slice() ?? [])),
    [isUrl, textQuery.data],
  )

  // ── Download ────────────────────────────────────────────────────────────────

  const downloadMutation = useStartDownloadMutation()

  /** Triggered by AlbumCard.onDownload — maps to POST /downloads {albumId, quality} */
  function handleDownload(albumId: string) {
    const album = albums.find((a) => a.id === albumId)
    downloadMutation.mutate({ albumId, quality }, {
      onSuccess: (result) => {
        useDownloadsStore.getState().enqueue({
          backendJobId: result.jobId,
          albumId,
          albumTitle: album?.title ?? 'Unknown Album',
          artistName: album?.artist.name ?? 'Unknown Artist',
          totalTracks: result.estimatedTracks,
          qualityOverride: quality,
        })
      },
    })
  }

  // ── Album detail panel ──────────────────────────────────────────────────────

  const [detailAlbumId,    setDetailAlbumId]    = useState<string | null>(null)
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set())

  const albumDetailQuery = useAlbumDetailQuery(detailAlbumId)
  const detailAlbum  = albumDetailQuery.data?.album
  const detailTracks = albumDetailQuery.data?.tracks ?? []

  function handleOpenAlbum(albumId: string) {
    setDetailAlbumId(albumId)
    setSelectedTrackIds(new Set())
  }

  function handleCloseAlbumDetail() {
    setDetailAlbumId(null)
    setSelectedTrackIds(new Set())
  }

  function toggleTrack(trackId: string) {
    setSelectedTrackIds((prev) => {
      const next = new Set(prev)
      if (next.has(trackId)) next.delete(trackId)
      else next.add(trackId)
      return next
    })
  }

  function toggleAllTracks() {
    if (selectedTrackIds.size === detailTracks.length && detailTracks.length > 0) {
      setSelectedTrackIds(new Set())
    } else {
      setSelectedTrackIds(new Set(detailTracks.map((t) => t.id)))
    }
  }

  function handleDownloadSelected() {
    if (!detailAlbumId) return
    const selectedTracks = detailTracks.filter((t) => selectedTrackIds.has(t.id))
    if (selectedTracks.length === 0) return

    if (selectedTracks.length === detailTracks.length) {
      // Full album — single job
      downloadMutation.mutate({ albumId: detailAlbumId, quality }, {
        onSuccess: (result) => {
          useDownloadsStore.getState().enqueue({
            backendJobId: result.jobId,
            albumId: detailAlbumId,
            albumTitle: detailAlbum?.title ?? 'Unknown Album',
            artistName: detailAlbum?.artist.name ?? 'Unknown Artist',
            totalTracks: result.estimatedTracks,
            qualityOverride: quality,
          })
        },
      })
    } else {
      // Individual tracks — one job per track
      for (const track of selectedTracks) {
        downloadMutation.mutate({ trackId: track.id, quality }, {
          onSuccess: (result) => {
            useDownloadsStore.getState().enqueue({
              backendJobId: result.jobId,
              albumId: detailAlbumId,
              albumTitle: track.title,
              artistName: track.artist.name,
              totalTracks: 1,
              qualityOverride: quality,
            })
          },
        })
      }
    }

    handleCloseAlbumDetail()
  }

  // ── Dashboard display states (wireframes §4–13) ─────────────────────────────

  const isActive   = isUrl || hasQuery
  // Show skeleton only on first fetch (no data yet); keepPreviousData handles refetch
  const isLoading  = isActive && !activeQuery.data && activeQuery.isFetching
  const isError    = isActive && activeQuery.isError && !isLoading
  const hasContent = isActive && !isLoading && !isError

  // ── Render guard: prevent dashboard flash before auth confirms ───────────
  if (status !== 'authenticated') {
    return null
  }

  return (
    <div className="relative isolate flex min-h-full flex-col gap-6 p-6">

      {/* Ecualizador decorativo de fondo — solo Dashboard. El relative va en
          este root (no contra el motion.div de PageTransition, cuyo transform
          crea un containing block intermitente durante las transiciones). */}
      <AudioWaves className="absolute inset-x-0 bottom-0 -z-10 h-40" />

      {/* Planta de interior (Fase 15) — utilería en la esquina, delante del
          skyline del ecualizador pero siempre tras el contenido (-z-10) */}
      <PottedPlant className="absolute bottom-0 right-6 -z-10 hidden h-40 w-auto sm:block" />

      {/* Altavoz vintage (Fase 15) — utilería en la esquina opuesta, misma
          línea de suelo que el ecualizador y la planta */}
      <VintageSpeaker className="absolute bottom-0 left-6 -z-10 hidden h-36 w-auto sm:block" />

      {/* Cassettes apilados (Fase 15) — pila desalineada junto al altavoz */}
      <CassetteStack className="absolute bottom-0 left-36 -z-10 hidden h-24 w-auto sm:block" />

      {/* Tocadiscos (Fase 15) — mesa con plato girando lento, entre el
          ecualizador y la planta */}
      <Turntable className="absolute bottom-0 right-40 -z-10 hidden h-28 w-auto md:block" />

      {/* Accessible live region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {isLoading && 'Searching…'}
        {hasContent && albums.length > 0 &&
          `${albums.length} album${albums.length !== 1 ? 's' : ''} found`}
        {hasContent && albums.length === 0 && 'No results found'}
        {isError && 'Search error. Please try again.'}
      </div>

      {/* ── Search + Quality toolbar ────────────────────────────────────── */}
      <section aria-label="Search and download quality settings">
        <div className="flex flex-col gap-4">
          {/* SearchInput — State A input, URL detection, text search */}
          <SearchInput
            value={query}
            onChange={setQuery}
          />

          {/* QualitySelector — role="radiogroup", keyboard arrow nav */}
          <div className="flex items-center gap-3">
            <span
              className="font-sans text-xs text-secondary"
              aria-hidden="true"
            >
              Quality:
            </span>
            <QualitySelector
              value={quality}
              onChange={setQuality}
            />
          </div>
        </div>
      </section>

      {/* ── Content area ────────────────────────────────────────────────── */}
      <section
        aria-label="Search results"
        aria-busy={isLoading || undefined}
      >
        {/* State A — initial empty (wireframes §4) */}
        {!isActive && (
          <EmptyState variant="initial" />
        )}

        {/* State B — loading skeletons (wireframes §5) */}
        {isLoading && (
          <SearchResults albums={[]} loading />
        )}

        {/* Error state */}
        {isError && (
          <EmptyState
            variant="error"
            onRetry={() => void activeQuery.refetch()}
          />
        )}

        {/* State C — no results (wireframes §9) */}
        {hasContent && albums.length === 0 && artists.length === 0 && (
          <EmptyState
            variant="no-results"
            query={trimmed}
          />
        )}

        {/* State D — results grid (wireframes §7) */}
        {hasContent && (albums.length > 0 || artists.length > 0) && (
          <SearchResults
            albums={albums}
            artists={artists}
            onOpenAlbum={handleOpenAlbum}
            onDownloadAlbum={handleDownload}
          />
        )}
      </section>

      {/* ── Album detail modal ───────────────────────────────────────────── */}
      <Modal
        isOpen={detailAlbumId !== null}
        onClose={handleCloseAlbumDetail}
        title={detailAlbum?.title ?? 'Album details'}
        size="lg"
      >
        {/* Loading */}
        {albumDetailQuery.isFetching && !detailAlbum && (
          <div className="flex items-center justify-center py-12">
            <p className="animate-pulse font-sans text-sm text-secondary">Loading...</p>
          </div>
        )}

        {/* Error */}
        {albumDetailQuery.isError && !detailAlbum && (
          <div className="flex items-center justify-center py-12">
            <p className="font-sans text-sm text-semantic-error">
              Couldn&apos;t load the album. Please try again.
            </p>
          </div>
        )}

        {/* Content */}
        {detailAlbum && (
          <div className="flex flex-col gap-5">
            {/* Album header */}
            <div className="flex gap-4">
              {detailAlbum.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detailAlbum.coverUrl}
                  alt={`${detailAlbum.title} cover`}
                  width={96}
                  height={96}
                  className="h-24 w-24 flex-shrink-0 rounded-md object-cover"
                />
              )}
              <div className="flex flex-col gap-1 justify-center">
                <p className="font-sans text-sm font-medium text-primary">
                  {detailAlbum.artist.name}
                </p>
                {detailAlbum.releaseDate && (
                  <p className="font-sans text-xs text-secondary">
                    {detailAlbum.releaseDate.slice(0, 4)}
                  </p>
                )}
                <p className="font-sans text-xs text-secondary">
                  {detailTracks.length} {detailTracks.length === 1 ? 'track' : 'tracks'}
                </p>
                {detailTracks.length > 0 && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="mt-1 w-fit"
                    onClick={() =>
                      usePlayerStore.getState().playQueue(detailTracks.map(toPlayerTrack), 0)
                    }
                    aria-label={`Play ${detailAlbum.title}`}
                  >
                    <Play aria-hidden="true" className="h-4 w-4" />
                    Play
                  </Button>
                )}
              </div>
            </div>

            {/* Select all row */}
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={
                    detailTracks.length > 0 &&
                    selectedTrackIds.size === detailTracks.length
                  }
                  onChange={toggleAllTracks}
                  className="h-4 w-4 accent-teal-500"
                  aria-label="Select all tracks"
                />
                <span className="font-sans text-sm text-secondary">Select all</span>
              </label>
              <span className="font-sans text-xs text-secondary">
                {selectedTrackIds.size} of {detailTracks.length} selected
              </span>
            </div>

            {/* Track list */}
            <div
              className="max-h-64 overflow-y-auto"
              role="list"
              aria-label="Track list"
            >
              {detailTracks.map((track, index) => (
                <label
                  key={track.id}
                  role="listitem"
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5',
                    'hover:bg-surface-console/50 transition-colors duration-75',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedTrackIds.has(track.id)}
                    onChange={() => toggleTrack(track.id)}
                    className="h-4 w-4 flex-shrink-0 accent-teal-500"
                    aria-label={`Select track: ${track.title}`}
                  />
                  {/* Play this track (and continue through the album). preventDefault
                      stops the surrounding <label> from also toggling the checkbox. */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      usePlayerStore
                        .getState()
                        .playQueue(detailTracks.map(toPlayerTrack), index)
                    }}
                    aria-label={`Play track: ${track.title}`}
                    className={cn(
                      'inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full',
                      'text-secondary transition-transform duration-150 ease-out active:scale-90',
                      'hover:text-teal-400 focus-visible:outline-none focus-visible:shadow-glow-focus',
                    )}
                  >
                    <Play aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 flex-shrink-0 font-mono text-xs text-secondary">
                    {String(track.trackNumber).padStart(2, '0')}
                  </span>
                  <span className="flex-1 truncate font-sans text-sm text-primary">
                    {track.title}
                  </span>
                  <span className="flex-shrink-0 font-mono text-xs text-secondary">
                    {formatSeconds(track.durationSeconds)}
                  </span>
                </label>
              ))}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-3 border-t border-subtle pt-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCloseAlbumDetail}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  handleDownload(detailAlbumId!)
                  handleCloseAlbumDetail()
                }}
              >
                Download full album
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={selectedTrackIds.size === 0 || downloadMutation.isPending}
                onClick={handleDownloadSelected}
              >
                Download selected ({selectedTrackIds.size})
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
