'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Play, User } from 'lucide-react'

import { cn } from '@/shared/lib/cn'
import { formatDuration } from '@/shared/lib/format'
import { Button } from '@/shared/ui'
import { useAuthStore } from '@/features/auth'
import { useArtistDetailQuery } from '@/features/artist-detail'
import { albumApi } from '@/features/album-detail'
import { AlbumCard } from '@/features/search'
import { usePlayerStore, trackToPlayerTrack } from '@/features/player'
import { useDownloadsStore, useStartDownloadMutation } from '@/features/downloads'

// ─── Component ────────────────────────────────────────────────────────────────

export function ArtistClient({ artistId }: { artistId: string }) {
  const router = useRouter()

  // ── Auth guard (mirror DashboardClient) ──────────────────────────────────
  const status = useAuthStore((s) => s.status)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  useEffect(() => {
    if (!hasHydrated) return
    if (status === 'expired' || status === 'unauthenticated') router.replace('/login')
  }, [status, hasHydrated, router])

  // Gate the query on auth: en carga en frío por URL, disparar antes de que el
  // store confirme la sesión produce un 401 que el interceptor convierte en
  // setExpired(). `status` ya es 'unauthenticated' hasta rehidratar (default
  // seguro) y pasa a 'authenticated' cuando la sesión está lista.
  const query = useArtistDetailQuery(artistId, status === 'authenticated')
  const data = query.data
  const downloadMutation = useStartDownloadMutation()

  // ── Playback ──────────────────────────────────────────────────────────────
  function playTopTracks(startIndex: number) {
    if (!data || data.topTracks.length === 0) return
    usePlayerStore.getState().playQueue(data.topTracks.map(trackToPlayerTrack), startIndex)
  }

  async function handlePlayAlbum(albumId: string) {
    const { tracks } = await albumApi.getDetail(albumId)
    if (tracks.length > 0) {
      usePlayerStore.getState().playQueue(tracks.map(trackToPlayerTrack), 0)
    }
  }

  function handleDownloadAlbum(albumId: string) {
    const album = data?.albums.find((a) => a.id === albumId)
    downloadMutation.mutate(
      { albumId, quality: 'MASTER' },
      {
        onSuccess: (result) => {
          useDownloadsStore.getState().enqueue({
            backendJobId: result.jobId,
            albumId,
            albumTitle: album?.title ?? 'Unknown Album',
            artistName: album?.artist.name ?? 'Unknown Artist',
            totalTracks: result.estimatedTracks,
            qualityOverride: 'MASTER',
          })
        },
      },
    )
  }

  // ── Render guard ──────────────────────────────────────────────────────────
  if (status !== 'authenticated') return null

  return (
    <div className="flex min-h-full flex-col gap-8 p-6">
      {/* ── Loading ───────────────────────────────────────────────────── */}
      {query.isFetching && !data && (
        <div className="flex items-center justify-center py-24">
          <p className="animate-pulse font-sans text-sm text-secondary">Cargando artista…</p>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {query.isError && !data && (
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <p className="font-sans text-sm text-semantic-error">
            No se pudo cargar el artista. Inténtalo de nuevo.
          </p>
          <Button type="button" variant="secondary" size="sm" onClick={() => void query.refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {data && (
        <>
          {/* ── Header ─────────────────────────────────────────────────── */}
          <header className="flex items-center gap-5">
            <div
              aria-hidden="true"
              className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-rack"
            >
              {data.artist.picture ? (
                <Image
                  src={data.artist.picture}
                  alt=""
                  width={112}
                  height={112}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-12 w-12 text-disabled" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="font-sans text-heading font-semibold text-primary">
                {data.artist.name}
              </h1>
              {data.topTracks.length > 0 && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="w-fit"
                  onClick={() => playTopTracks(0)}
                  aria-label={`Reproducir lo mejor de ${data.artist.name}`}
                >
                  <Play aria-hidden="true" className="h-4 w-4" />
                  Reproducir
                </Button>
              )}
            </div>
          </header>

          {/* ── Top tracks ─────────────────────────────────────────────── */}
          {data.topTracks.length > 0 && (
            <section aria-label="Top tracks" className="flex flex-col gap-2">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-secondary">
                Populares
              </h2>
              <ol className="flex flex-col">
                {data.topTracks.map((track, index) => (
                  <li key={track.id}>
                    <div
                      className={cn(
                        'flex items-center gap-3 rounded-md px-2 py-2',
                        'hover:bg-surface-console/50 transition-colors duration-75',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => playTopTracks(index)}
                        aria-label={`Reproducir: ${track.title}`}
                        className={cn(
                          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                          'text-secondary transition-transform duration-150 ease-out active:scale-90',
                          'hover:text-teal-400 focus-visible:outline-none focus-visible:shadow-glow-focus',
                        )}
                      >
                        <Play aria-hidden="true" className="h-4 w-4" />
                      </button>
                      <span className="w-5 shrink-0 text-right font-mono text-xs text-disabled">
                        {index + 1}
                      </span>
                      <span className="flex-1 truncate font-sans text-sm text-primary">
                        {track.title}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-secondary tabular-nums">
                        {formatDuration(track.durationSeconds)}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* ── Albums ─────────────────────────────────────────────────── */}
          {data.albums.length > 0 && (
            <section aria-label="Álbumes" className="flex flex-col gap-3">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-secondary">
                Álbumes
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {data.albums.map((album) => (
                  <AlbumCard
                    key={album.id}
                    album={album}
                    onPlay={handlePlayAlbum}
                    onDownload={handleDownloadAlbum}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
