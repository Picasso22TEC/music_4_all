'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Download, ListMusic, Music, Play, User } from 'lucide-react'

import { cn } from '@/shared/lib/cn'
import type { Album, TopHit, Track } from '@/entities'
import { Button } from '@/shared/ui/Button'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TopResultCardProps {
  topHit: TopHit
  onPlayAlbum?: (albumId: string) => void
  onDownloadAlbum?: (albumId: string) => void
  onPlayTrack?: (track: Track) => void
  onDownloadTrack?: (track: Track) => void
}

// ─── Shared shell ───────────────────────────────────────────────────────────

/**
 * The prominent "Top result" card (Tidal/Spotify affordance): the single best
 * match for the query, rendered larger than the grid results. A discriminated
 * union on `topHit.type` keeps each branch fully typed.
 */
export function TopResultCard(props: TopResultCardProps) {
  const { topHit } = props
  switch (topHit.type) {
    case 'artist':
      return (
        <Shell
          href={`/artist/${topHit.artist.id}`}
          label={`Open artist ${topHit.artist.name}`}
          circular
          cover={topHit.artist.imageUrl}
          fallback={<User aria-hidden="true" className="h-12 w-12 text-disabled" />}
          kind="Artist"
          title={topHit.artist.name}
        />
      )
    case 'album':
      return (
        <Shell
          href={`/album/${topHit.album.id}`}
          label={`Open ${topHit.album.title}`}
          cover={topHit.album.coverUrl || null}
          fallback={<Music aria-hidden="true" className="h-12 w-12 text-disabled" />}
          kind="Album"
          title={topHit.album.title}
          subtitle={topHit.album.artist.name}
          actions={<AlbumActions album={topHit.album} {...props} />}
        />
      )
    case 'track':
      return (
        <Shell
          cover={topHit.track.coverUrl || null}
          fallback={<Music aria-hidden="true" className="h-12 w-12 text-disabled" />}
          kind="Song"
          title={topHit.track.title}
          subtitle={topHit.track.artist.name}
          actions={<TrackActions track={topHit.track} {...props} />}
        />
      )
    case 'playlist':
      return (
        <Shell
          cover={topHit.playlist.coverUrl}
          fallback={<ListMusic aria-hidden="true" className="h-12 w-12 text-disabled" />}
          kind="Playlist"
          title={topHit.playlist.title}
        />
      )
  }
}

// ─── Layout shell ───────────────────────────────────────────────────────────

function Shell({
  href,
  label,
  circular = false,
  cover,
  fallback,
  kind,
  title,
  subtitle,
  actions,
}: {
  href?: string
  label?: string
  circular?: boolean
  cover: string | null
  fallback: React.ReactNode
  kind: string
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  const art = (
    <div
      className={cn(
        'relative h-24 w-24 shrink-0 overflow-hidden bg-surface-rack sm:h-28 sm:w-28',
        circular ? 'rounded-full' : 'rounded-md',
      )}
    >
      {cover ? (
        <Image src={cover} alt="" fill sizes="112px" className="object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center">{fallback}</span>
      )}
    </div>
  )

  const heading = (
    <>
      <span className="font-mono text-2xs font-semibold uppercase tracking-[0.25em] text-secondary">
        Top result
      </span>
      <h3 className="mt-1 line-clamp-2 font-sans text-xl font-bold leading-tight text-primary sm:text-2xl">
        {title}
      </h3>
      <p className="mt-1 font-mono text-2xs uppercase tracking-wider text-secondary">
        {subtitle ? (
          <>
            {kind}
            <span aria-hidden="true"> · </span>
            <span className="normal-case tracking-normal">{subtitle}</span>
          </>
        ) : (
          kind
        )}
      </p>
    </>
  )

  return (
    <section
      aria-label={`Top result: ${title}`}
      className={cn(
        'flex items-center gap-4 rounded-lg border border-subtle bg-surface-console/40 p-4 sm:p-5',
        'transition-colors duration-150',
      )}
    >
      {/* Cover + heading link to the entity page when there is one (artist/album) */}
      {href ? (
        <Link
          href={href}
          aria-label={label}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-4 rounded-md',
            'transition-transform duration-150 ease-out hover:-translate-y-0.5',
            'focus-visible:outline-none focus-visible:shadow-glow-focus',
          )}
        >
          {art}
          <div className="min-w-0 flex-1">{heading}</div>
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {art}
          <div className="min-w-0 flex-1">{heading}</div>
        </div>
      )}

      {actions && <div className="flex shrink-0 flex-col gap-2">{actions}</div>}
    </section>
  )
}

// ─── Actions ──────────────────────────────────────────────────────────────────

function AlbumActions({
  album,
  onPlayAlbum,
  onDownloadAlbum,
}: { album: Album } & Pick<TopResultCardProps, 'onPlayAlbum' | 'onDownloadAlbum'>) {
  return (
    <>
      {onPlayAlbum && (
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => onPlayAlbum(album.id)}
          aria-label={`Play ${album.title}`}
        >
          <Play aria-hidden="true" className="h-4 w-4" />
          Play
        </Button>
      )}
      {onDownloadAlbum && (
        <Button
          type="button"
          variant="neon"
          size="sm"
          onClick={() => onDownloadAlbum(album.id)}
          aria-label={`Download ${album.title}`}
        >
          <Download aria-hidden="true" className="h-4 w-4" />
          Download
        </Button>
      )}
    </>
  )
}

function TrackActions({
  track,
  onPlayTrack,
  onDownloadTrack,
}: { track: Track } & Pick<TopResultCardProps, 'onPlayTrack' | 'onDownloadTrack'>) {
  return (
    <>
      {onPlayTrack && (
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => onPlayTrack(track)}
          aria-label={`Play ${track.title}`}
        >
          <Play aria-hidden="true" className="h-4 w-4" />
          Play
        </Button>
      )}
      {onDownloadTrack && (
        <Button
          type="button"
          variant="neon"
          size="sm"
          onClick={() => onDownloadTrack(track)}
          aria-label={`Download ${track.title}`}
        >
          <Download aria-hidden="true" className="h-4 w-4" />
          Download
        </Button>
      )}
    </>
  )
}
