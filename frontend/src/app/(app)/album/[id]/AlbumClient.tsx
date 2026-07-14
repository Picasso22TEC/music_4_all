'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Music, Play } from 'lucide-react'

import { cn } from '@/shared/lib/cn'
import { formatDuration } from '@/shared/lib/format'
import { Button, QualitySelector } from '@/shared/ui'
import { useAuthStore } from '@/features/auth'
import { useAlbumDetailQuery } from '@/features/album-detail'
import { usePlayerStore, trackToPlayerTrack } from '@/features/player'
import { useDownloadsStore, useStartDownloadMutation } from '@/features/downloads'
import { useSettingsStore } from '@/features/settings'

// ─── Component ────────────────────────────────────────────────────────────────

export function AlbumClient({ albumId }: { albumId: string }) {
  const router = useRouter()

  // ── Auth guard (mirror ArtistClient) ─────────────────────────────────────
  const status = useAuthStore((s) => s.status)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  useEffect(() => {
    if (!hasHydrated) return
    if (status === 'expired' || status === 'unauthenticated') router.replace('/login')
  }, [status, hasHydrated, router])

  const query = useAlbumDetailQuery(albumId, status === 'authenticated')
  const album = query.data?.album
  const tracks = query.data?.tracks ?? []

  const quality = useSettingsStore((s) => s.audioQuality)
  const setQuality = useSettingsStore((s) => s.setAudioQuality)
  const downloadMutation = useStartDownloadMutation()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // ── Playback ──────────────────────────────────────────────────────────────
  function playFrom(startIndex: number) {
    if (tracks.length === 0) return
    usePlayerStore.getState().playQueue(tracks.map(trackToPlayerTrack), startIndex)
  }

  // ── Selection ─────────────────────────────────────────────────────────────
  function toggleTrack(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleAll() {
    if (selected.size === tracks.length && tracks.length > 0) setSelected(new Set())
    else setSelected(new Set(tracks.map((t) => t.id)))
  }

  // ── Download ──────────────────────────────────────────────────────────────
  function enqueueAlbum() {
    downloadMutation.mutate(
      { albumId, quality },
      {
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
      },
    )
  }

  function downloadSelected() {
    const chosen = tracks.filter((t) => selected.has(t.id))
    if (chosen.length === 0) return
    if (chosen.length === tracks.length) {
      enqueueAlbum()
    } else {
      for (const track of chosen) {
        downloadMutation.mutate(
          { trackId: track.id, quality },
          {
            onSuccess: (result) => {
              useDownloadsStore.getState().enqueue({
                backendJobId: result.jobId,
                albumId,
                albumTitle: track.title,
                artistName: track.artist.name,
                totalTracks: 1,
                qualityOverride: quality,
              })
            },
          },
        )
      }
    }
    setSelected(new Set())
  }

  // ── Render guard ──────────────────────────────────────────────────────────
  if (status !== 'authenticated') return null

  const allSelected = selected.size === tracks.length && tracks.length > 0

  return (
    <div className="flex min-h-full flex-col gap-6 p-6">
      {/* Back — A1 */}
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Go back"
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-rack text-primary',
          'transition-transform duration-150 ease-out active:scale-90',
          'hover:bg-surface-console focus-visible:outline-none focus-visible:shadow-glow-focus',
          'w-fit',
        )}
      >
        <ArrowLeft aria-hidden="true" className="h-5 w-5" />
      </button>

      {query.isFetching && !album && (
        <p className="animate-pulse py-16 text-center font-sans text-sm text-secondary">
          Loading album…
        </p>
      )}

      {query.isError && !album && (
        <div className="flex flex-col items-center gap-3 py-16">
          <p className="font-sans text-sm text-semantic-error">
            Couldn&apos;t load the album. Please try again.
          </p>
          <Button type="button" variant="secondary" size="sm" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      )}

      {album && (
        <>
          {/* ── Header — cover + info ─────────────────────────────────── */}
          <header className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <div
              aria-hidden="true"
              className="flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-rack shadow-lg"
            >
              {album.coverUrl ? (
                <Image
                  src={album.coverUrl}
                  alt=""
                  width={160}
                  height={160}
                  priority
                  className="h-full w-full object-cover"
                />
              ) : (
                <Music className="h-14 w-14 text-disabled" />
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <span className="font-mono text-2xs font-semibold uppercase tracking-[0.3em] text-secondary">
                Album
              </span>
              <h1 className="font-sans text-3xl font-bold leading-tight text-primary sm:text-4xl">
                {album.title}
              </h1>
              <p className="font-sans text-sm text-secondary">
                {album.artist.id ? (
                  <Link
                    href={`/artist/${album.artist.id}`}
                    className="rounded-sm font-medium text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:shadow-glow-focus"
                  >
                    {album.artist.name}
                  </Link>
                ) : (
                  <span className="font-medium text-primary">{album.artist.name}</span>
                )}
                <span aria-hidden="true"> · </span>
                {album.releaseYear}
                <span aria-hidden="true"> · </span>
                {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                {tracks.length > 0 && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => playFrom(0)}
                    aria-label={`Play ${album.title}`}
                  >
                    <Play aria-hidden="true" className="h-4 w-4" />
                    Play
                  </Button>
                )}
                <Button type="button" variant="secondary" size="sm" onClick={enqueueAlbum}>
                  Download full album
                </Button>
              </div>
              <div className="mt-1 flex items-center gap-3">
                <span className="font-sans text-xs text-secondary" aria-hidden="true">
                  Quality:
                </span>
                <QualitySelector value={quality} onChange={setQuality} />
              </div>
            </div>
          </header>

          {/* ── Track list ───────────────────────────────────────────── */}
          {tracks.length > 0 && (
            <section aria-label="Track list" className="flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-subtle pb-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 accent-teal-500"
                    aria-label="Select all tracks"
                  />
                  <span className="font-sans text-sm text-secondary">Select all</span>
                </label>
                {selected.size > 0 && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={downloadSelected}
                    disabled={downloadMutation.isPending}
                  >
                    Download selected ({selected.size})
                  </Button>
                )}
              </div>

              <ol className="flex flex-col">
                {tracks.map((track, index) => (
                  <li key={track.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-md px-2 py-2',
                        'transition-colors duration-75 hover:bg-surface-console/50',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(track.id)}
                        onChange={() => toggleTrack(track.id)}
                        className="h-4 w-4 shrink-0 accent-teal-500"
                        aria-label={`Select track: ${track.title}`}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          playFrom(index)
                        }}
                        aria-label={`Play track: ${track.title}`}
                        className={cn(
                          'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                          'text-secondary transition-transform duration-150 ease-out active:scale-90',
                          'hover:text-teal-400 focus-visible:outline-none focus-visible:shadow-glow-focus',
                        )}
                      >
                        <Play aria-hidden="true" className="h-4 w-4" />
                      </button>
                      <span className="w-6 shrink-0 text-right font-mono text-xs text-disabled">
                        {track.trackNumber}
                      </span>
                      <span className="flex-1 truncate font-sans text-sm text-primary">
                        {track.title}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-secondary tabular-nums">
                        {formatDuration(track.durationSeconds)}
                      </span>
                    </label>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </div>
  )
}
