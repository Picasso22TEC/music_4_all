'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/shared/lib/cn'
import { AlbumCard } from '@/features/search'
import type { Album } from '@/entities'

import { SectionHeading } from './SectionHeading'

// ─── Arrow button ─────────────────────────────────────────────────────────────

function ArrowButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void
  disabled: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-full border border-subtle bg-surface-rack',
        'text-secondary transition-transform duration-150 ease-out active:scale-90',
        'hover:text-primary focus-visible:outline-none focus-visible:shadow-glow-focus',
        'disabled:cursor-not-allowed disabled:text-ghost disabled:opacity-40 disabled:hover:text-ghost',
      )}
    >
      {children}
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * A release row for the artist page (Albums / Singles & EPs / Compilations).
 * Collapsed: a horizontal carousel scrolled by arrows. "View all" expands it to
 * a full grid (like the top-tracks "See all"). Reuses AlbumCard.
 */
export function ReleaseSection({
  title,
  subtitle,
  albums,
  onPlay,
  onDownload,
}: {
  title: string
  subtitle: string
  albums: Album[]
  onPlay?: (albumId: string) => void
  onDownload?: (albumId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const updateArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    updateArrows()
  }, [albums, expanded, updateArrows])

  function scrollByPage(direction: 1 | -1) {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  if (albums.length === 0) return null

  return (
    <section aria-label={title} className="flex flex-col gap-4">
      {/* Header — title + subtitle (left) · View all + arrows (right) */}
      <div className="flex items-start justify-between gap-2">
        <SectionHeading title={title} subtitle={subtitle} />
        <div className="flex shrink-0 items-center gap-1.5">
          {albums.length > 1 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className={cn(
                'rounded-sm px-2 py-1 font-mono text-xs font-semibold uppercase tracking-wider',
                'text-secondary transition-colors hover:text-primary',
                'focus-visible:outline-none focus-visible:shadow-glow-focus',
              )}
            >
              {expanded ? 'Show less' : 'View all'}
            </button>
          )}
          {!expanded && (
            <>
              <ArrowButton onClick={() => scrollByPage(-1)} disabled={!canLeft} label={`Scroll ${title} left`}>
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              </ArrowButton>
              <ArrowButton onClick={() => scrollByPage(1)} disabled={!canRight} label={`Scroll ${title} right`}>
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </ArrowButton>
            </>
          )}
        </div>
      </div>

      {expanded ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} onPlay={onPlay} onDownload={onDownload} />
          ))}
        </div>
      ) : (
        <div
          ref={scrollRef}
          onScroll={updateArrows}
          className={cn(
            'flex snap-x gap-4 overflow-x-auto scroll-smooth pb-2',
            '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          )}
        >
          {albums.map((album) => (
            <div key={album.id} className="w-40 shrink-0 snap-start sm:w-44">
              <AlbumCard album={album} onPlay={onPlay} onDownload={onDownload} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
