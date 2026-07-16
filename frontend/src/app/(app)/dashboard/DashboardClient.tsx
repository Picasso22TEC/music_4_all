'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

import type { Album, ArtistResult } from '@/entities'
import { isValidTidalUrl } from '@/shared/lib/url.utils'
import {
  AudioWaves,
  CassetteStack,
  PottedPlant,
  QualitySelector,
  Turntable,
  VintageSpeaker,
} from '@/shared/ui'

import { useAuthStore } from '@/features/auth'
import { useSettingsStore } from '@/features/settings'
import {
  EmptyState,
  SearchResults,
  useResolveUrlQuery,
  useSearchQuery,
  useSearchStore,
} from '@/features/search'
import {
  useStartDownloadMutation,
  useDownloadsStore,
  useDownloadErrorToast,
} from '@/features/downloads'

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
  // Query lives in the global store (driven by the AppHeader search bar, A2/A4).
  const query = useSearchStore((s) => s.query)

  // Calidad de descarga — fuente ÚNICA en el settings.store (el toolbar del
  // dashboard es un atajo a la misma preferencia que usan álbum y artista).
  const quality = useSettingsStore((s) => s.audioQuality)
  const setQuality = useSettingsStore((s) => s.setAudioQuality)
  const reduceEffects = useSettingsStore((s) => s.reduceEffects)

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
  const onDownloadError = useDownloadErrorToast()

  /** Triggered by AlbumCard.onDownload — maps to POST /downloads {albumId, quality} */
  function handleDownload(albumId: string) {
    const album = albums.find((a) => a.id === albumId)
    downloadMutation.mutate({ albumId, quality }, {
      onError: onDownloadError,
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

      {/* Escena decorativa de la tienda de discos (Fase 15) — solo Dashboard.
          Se oculta cuando el usuario activa "Reduce visual effects" en Settings
          (además de lo que ya hace prefers-reduced-motion en las animaciones). */}
      {!reduceEffects && (
        <>
          {/* Ecualizador decorativo de fondo. El relative va en este root (no
              contra el motion.div de PageTransition, cuyo transform crea un
              containing block intermitente durante las transiciones). */}
          <AudioWaves className="absolute inset-x-0 bottom-0 -z-10 h-40" />

          {/* Planta de interior — utilería en la esquina, delante del skyline
              del ecualizador pero siempre tras el contenido (-z-10) */}
          <PottedPlant className="absolute bottom-0 right-6 -z-10 hidden h-40 w-auto sm:block" />

          {/* Altavoz vintage — utilería en la esquina opuesta, misma línea de
              suelo que el ecualizador y la planta */}
          <VintageSpeaker className="absolute bottom-0 left-6 -z-10 hidden h-36 w-auto sm:block" />

          {/* Cassettes apilados — pila desalineada junto al altavoz */}
          <CassetteStack className="absolute bottom-0 left-36 -z-10 hidden h-24 w-auto sm:block" />

          {/* Tocadiscos — mesa con plato girando lento, entre el ecualizador y
              la planta */}
          <Turntable className="absolute bottom-0 right-40 -z-10 hidden h-28 w-auto md:block" />
        </>
      )}

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

      {/* ── Download quality toolbar (search lives in the AppHeader now) ──── */}
      <section aria-label="Download quality settings">
        {/* QualitySelector — role="radiogroup", keyboard arrow nav */}
        <div className="flex items-center gap-3">
          <span className="font-sans text-xs text-secondary" aria-hidden="true">
            Quality:
          </span>
          <QualitySelector value={quality} onChange={setQuality} />
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
            onDownloadAlbum={handleDownload}
          />
        )}
      </section>

    </div>
  )
}
