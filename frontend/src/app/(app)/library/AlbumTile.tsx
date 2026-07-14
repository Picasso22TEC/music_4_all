'use client'

import Image from 'next/image'
import { Music } from 'lucide-react'

import { cn } from '@/shared/lib/cn'
import { Badge } from '@/shared/ui/Badge'
import type { BadgeVariant } from '@/shared/ui/Badge'

import type { LibraryAlbum } from './groupAlbums'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Deriva un sello corto (≤ 8 chars, límite del Badge) de la calidad libre. */
function resolveQuality(quality: string): { label: string; variant: BadgeVariant } {
  const q = quality.toLowerCase()
  if (q.includes('master')) return { label: 'MASTER', variant: 'quality' }
  if (q.includes('hi-res') || q.includes('hires') || q.includes('24bit') || q.includes('24 bit')) {
    return { label: 'HI-RES', variant: 'quality' }
  }
  if (q.includes('flac') || q.includes('lossless')) return { label: 'FLAC', variant: 'format' }
  if (q.includes('aac') || q.includes('mp3') || q.includes('m4a') || q.includes('320')) {
    return { label: 'AAC', variant: 'format' }
  }
  return { label: 'AUDIO', variant: 'default' }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en', {
      month: 'short',
      day:   'numeric',
      year:  'numeric',
    })
  } catch {
    return iso
  }
}

// ─── Component (presentacional) ───────────────────────────────────────────────

export function AlbumTile({ album, priority = false }: { album: LibraryAlbum; priority?: boolean }) {
  const badge = resolveQuality(album.quality)
  const dateLabel = formatDate(album.downloadedAt)
  const tracks = `${album.trackCount} track${album.trackCount !== 1 ? 's' : ''}`

  return (
    <article
      aria-label={`${album.artist} — ${tracks}, ${album.quality}, downloaded ${dateLabel}`}
      className="group flex flex-col gap-2"
    >
      <div className="relative">
        {/* Funda cuadrada (no el vinilo circular de la búsqueda) — estantería */}
        <div
          className={cn(
            'relative aspect-square w-full overflow-hidden rounded-md',
            'border border-subtle bg-surface-studio',
            'transition-shadow duration-300 group-hover:shadow-glow-active',
          )}
        >
          {album.coverUrl ? (
            <Image
              src={album.coverUrl}
              alt=""
              fill
              priority={priority}
              sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center text-disabled"
              aria-hidden="true"
            >
              <Music className="h-10 w-10" />
            </span>
          )}
        </div>

        {/* Sello de calidad — esquina, rotado (como en las vinyl cards) */}
        <div className="pointer-events-none absolute bottom-2 left-2 -rotate-[8deg]">
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
      </div>

      {/* Meta — lidera el artista (sin título de álbum en los datos) */}
      <div className="flex flex-col gap-0.5">
        <h3 className="truncate font-sans text-sm font-semibold text-primary">
          {album.artist}
        </h3>
        <p className="truncate font-mono text-2xs text-secondary">
          {tracks} · {dateLabel}
        </p>
      </div>
    </article>
  )
}
