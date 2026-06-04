'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import type { Album, AudioQuality } from '@/entities'
import { isValidTidalUrl } from '@/shared/lib/url.utils'
import { QualitySelector } from '@/shared/ui'

import { useAuthStore } from '@/features/auth'
import {
  EmptyState,
  SearchInput,
  SearchResults,
  useResolveUrlQuery,
  useSearchQuery,
} from '@/features/search'
import { useStartDownloadMutation } from '@/features/downloads'

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

  useEffect(() => {
    if (status === 'expired' || status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

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

  // ── Download ────────────────────────────────────────────────────────────────

  const downloadMutation = useStartDownloadMutation()

  /** Triggered by AlbumCard.onDownload — maps to POST /downloads {albumId, quality} */
  function handleDownload(albumId: string) {
    downloadMutation.mutate({ albumId, quality })
  }

  /** Triggered by AlbumCard.onOpen — AlbumDetailPanel deferred to Phase 6C */
  function handleOpenAlbum(albumId: string) {
    // TODO: AlbumDetailPanel — Phase 6C
    console.info('[Dashboard] Open album detail:', albumId)
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
    <div className="flex flex-col gap-6 p-6">

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
        {hasContent && albums.length === 0 && (
          <EmptyState
            variant="no-results"
            query={trimmed}
          />
        )}

        {/* State D — results grid (wireframes §7) */}
        {hasContent && albums.length > 0 && (
          <SearchResults
            albums={albums}
            onOpenAlbum={handleOpenAlbum}
            onDownloadAlbum={handleDownload}
          />
        )}
      </section>
    </div>
  )
}
