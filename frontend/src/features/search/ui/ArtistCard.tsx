'use client'

import Image from 'next/image'
import Link from 'next/link'
import { User } from 'lucide-react'

import { cn } from '@/shared/lib/cn'
import type { ArtistResult } from '@/entities'

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Artist search result — circular photo + name, links to /artist/[id].
 * Mirrors the Spotify/Tidal search affordance where an artist is a first-class
 * result (previously the artist was only reachable via an album card link).
 */
export function ArtistCard({ artist }: { artist: ArtistResult }) {
  return (
    <Link
      href={`/artist/${artist.id}`}
      aria-label={`Open artist ${artist.name}`}
      className={cn(
        'group flex flex-col items-center gap-2 rounded-lg p-2 text-center',
        'transition-colors duration-100 hover:bg-surface-console/40',
        'focus-visible:outline-none focus-visible:shadow-glow-focus',
      )}
    >
      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-full bg-surface-rack">
        {artist.imageUrl ? (
          <Image
            src={artist.imageUrl}
            alt=""
            width={160}
            height={160}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <User aria-hidden="true" className="h-10 w-10 text-disabled" />
        )}
      </div>
      <span className="w-full truncate font-sans text-sm font-medium text-primary">
        {artist.name}
      </span>
      <span className="font-mono text-2xs uppercase tracking-wider text-secondary">Artist</span>
    </Link>
  )
}
