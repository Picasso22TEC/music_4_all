'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Music, Play } from 'lucide-react'

import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
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
  /** Streams the whole album (play button overlaid on the vinyl). */
  onPlay?: (albumId: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * VinylCard (Fase 4) — consumes Album entity (NOT SearchResult legacy).
 *
 * Disc button → onOpen (opens AlbumDetailPanel)
 * Download button → onDownload
 *
 * Accessibility: article + labelled buttons, no div-click anti-patterns.
 */
export function AlbumCard({ album, onOpen, onDownload, onPlay }: AlbumCardProps) {
  const badge = resolveQualityBadge(album)
  const reducedMotion = useReducedMotion()

  return (
    <article
      aria-label={`${album.title} by ${album.artist.name}, ${album.releaseYear}`}
      className="group flex flex-col items-center gap-3"
    >
      {/* ── Vinyl disc — opens album detail (click target) ─────────────── */}
      <div className="relative w-full">
        <motion.button
          type="button"
          onClick={() => onOpen?.(album.id)}
          disabled={!onOpen}
          aria-label={`Open details for ${album.title}`}
          whileHover={reducedMotion ? undefined : { scale: 1.05, rotate: -3 }}
          whileTap={reducedMotion ? undefined : { scale: 0.98 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={cn(
            'relative block aspect-square w-full overflow-hidden rounded-full',
            'border border-surface-rack bg-surface-void',
            'shadow-none transition-shadow duration-300 group-hover:shadow-glow-active',
            'focus-visible:outline-none focus-visible:shadow-glow-focus',
            onOpen ? 'cursor-pointer' : 'cursor-default',
          )}
        >
          {/* Surcos concéntricos — anillos sutiles del vinilo */}
          <span aria-hidden="true" className="absolute inset-[5%] rounded-full border border-surface-rack/30" />
          <span aria-hidden="true" className="absolute inset-[9%] rounded-full border border-surface-rack/20" />
          <span aria-hidden="true" className="absolute inset-[13%] rounded-full border border-surface-rack/10" />

          {/* Portada — círculo centrado, ~70% del diámetro del disco */}
          <span className="absolute inset-[15%] overflow-hidden rounded-full bg-surface-studio">
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
                className="flex h-full w-full items-center justify-center text-disabled"
                aria-hidden="true"
              >
                <Music className="h-10 w-10" />
              </span>
            )}
          </span>

          {/* Agujero central del vinilo */}
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 z-raised h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-surface-rack bg-surface-void"
          />
        </motion.button>

        {/* Quality badge — sello sobre el vinilo, fuera de la máscara circular */}
        <div className="pointer-events-none absolute bottom-[6%] left-[6%] z-raised -rotate-[10deg]">
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>

        {/* Play button — reproduce el álbum en streaming (esquina opuesta al sello) */}
        {onPlay && (
          <button
            type="button"
            onClick={() => onPlay(album.id)}
            aria-label={`Reproducir ${album.title}`}
            className={cn(
              'absolute bottom-[6%] right-[6%] z-raised inline-flex h-9 w-9 items-center justify-center rounded-full',
              'bg-teal-500 text-surface-void shadow-md',
              'transition-transform duration-150 ease-out hover:bg-teal-400 active:scale-95',
              'focus-visible:outline-none focus-visible:shadow-glow-focus',
            )}
          >
            <Play aria-hidden="true" className="h-4 w-4 translate-x-px" />
          </button>
        )}
      </div>

      {/* ── Info + Download ─────────────────────────────────────────── */}
      <div className="flex w-full flex-1 flex-col items-center gap-0.5 text-center">
        {/* Title */}
        <h3 className="w-full truncate font-sans text-sm font-semibold text-primary">
          {album.title}
        </h3>

        {/* Artist — enlaza a su página cuando hay id */}
        <p className="w-full truncate font-sans text-xs text-secondary">
          {album.artist.id ? (
            <Link
              href={`/artist/${album.artist.id}`}
              className="rounded-sm transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:shadow-glow-focus"
            >
              {album.artist.name}
            </Link>
          ) : (
            album.artist.name
          )}
        </p>

        {/* Year */}
        <p className="font-mono text-2xs text-disabled">
          {album.releaseYear}
        </p>

        {/* Download button */}
        {onDownload && (
          <Button
            type="button"
            variant="neon"
            size="sm"
            onClick={() => onDownload(album.id)}
            aria-label={`Download ${album.title} by ${album.artist.name}`}
            className="mt-2 w-full"
          >
            DESCARGAR
          </Button>
        )}
      </div>
    </article>
  )
}
