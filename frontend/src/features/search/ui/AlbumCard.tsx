'use client'

import Image from 'next/image'

import { cn } from '@/shared/lib/cn'
import type { Album, AudioQuality } from '@/entities'
import { Badge } from '@/shared/ui/Badge'
import type { BadgeVariant } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'

// ─── Quality badge mapping (design-system §3.6) ───────────────────────────────

type BadgeConfig = { label: string; variant: BadgeVariant }

function resolveQualityBadge(album: Album): BadgeConfig {
  // MQA takes precedence — it's the most specific format signal
  if (album.audioModes.includes('MQA')) {
    return { label: 'MQA', variant: 'quality' }
  }
  const BY_QUALITY: Record<AudioQuality, BadgeConfig> = {
    MASTER: { label: 'MASTER', variant: 'quality' },
    HIRES:  { label: 'HIRES',  variant: 'quality' },
    HIGH:   { label: 'FLAC',   variant: 'format'  },
    NORMAL: { label: 'AAC',    variant: 'format'  },
  }
  return BY_QUALITY[album.audioQuality] ?? { label: album.audioQuality, variant: 'default' }
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AlbumCardProps {
  album: Album
  /** Opens the AlbumDetailPanel (State D in wireframes) */
  onOpen?: (albumId: string) => void
  /** Starts download with quality override — opens QualitySelector */
  onDownload?: (albumId: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Album card v2 — consumes Album entity (NOT SearchResult legacy).
 *
 * Artwork button → onOpen (opens AlbumDetailPanel)
 * Download button → onDownload
 *
 * Accessibility: article + labelled buttons, no div-click anti-patterns.
 */
export function AlbumCard({ album, onOpen, onDownload }: AlbumCardProps) {
  const badge = resolveQualityBadge(album)

  return (
    <article
      aria-label={`${album.title} by ${album.artist.name}, ${album.releaseYear}`}
      className={cn(
        'group flex flex-col overflow-hidden',
        'bg-surface-console border rounded-md',
        'transition-shadow duration-150 ease-out hover:shadow-md',
      )}
    >
      {/* ── Artwork — opens album detail (click target) ────────────── */}
      <button
        type="button"
        onClick={() => onOpen?.(album.id)}
        disabled={!onOpen}
        aria-label={`Open details for ${album.title}`}
        className={cn(
          'relative block aspect-square w-full overflow-hidden bg-surface-studio',
          'focus-visible:outline-none focus-visible:shadow-glow-focus',
          onOpen ? 'cursor-pointer' : 'cursor-default',
        )}
      >
        {album.coverUrl ? (
          <Image
            src={album.coverUrl}
            alt={`Album cover for ${album.title} by ${album.artist.name}`}
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center text-4xl text-disabled"
            aria-hidden="true"
          >
            ♪
          </span>
        )}

        {/* Quality badge — bottom-left overlay */}
        <div className="absolute bottom-2 left-2 z-raised">
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
      </button>

      {/* ── Info + Download ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-0.5 p-3">
        {/* Title */}
        <h3 className="truncate font-sans text-sm font-semibold text-primary">
          {album.title}
        </h3>

        {/* Artist */}
        <p className="truncate font-sans text-xs text-secondary">
          {album.artist.name}
        </p>

        {/* Year */}
        <p className="font-mono text-2xs text-disabled">
          {album.releaseYear}
        </p>

        {/* Download button */}
        {onDownload && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onDownload(album.id)}
            aria-label={`Download ${album.title} by ${album.artist.name}`}
            className="mt-2 w-full"
          >
            ↓ Download
          </Button>
        )}
      </div>
    </article>
  )
}
