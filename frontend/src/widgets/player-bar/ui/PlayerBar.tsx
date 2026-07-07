'use client'

import Image from 'next/image'
import { CircleSlash, Music } from 'lucide-react'

import { cn } from '@/shared/lib/cn'
import { formatDuration } from '@/shared/lib/format'
import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
import { ProgressBar } from '@/shared/ui/ProgressBar'
import { usePlayerStore } from '@/features/player'

// ─── Component (wireframes §16) ───────────────────────────────────────────────

export function PlayerBar() {
  const currentTrack  = usePlayerStore((s) => s.currentTrack)
  const isPlaying     = usePlayerStore((s) => s.isPlaying)
  const progressSec   = usePlayerStore((s) => s.progressSeconds)
  const volume        = usePlayerStore((s) => s.volume)
  const reducedMotion = useReducedMotion()

  const progressPercent = currentTrack
    ? Math.min(100, Math.max(0, Math.round((progressSec / currentTrack.durationSeconds) * 100)))
    : 0

  return (
    <div
      role="region"
      aria-label="Reproductor de audio — próximamente"
      className={cn(
        // Position — fixed bottom, full width (wireframes §16 — z-sticky:200)
        'fixed bottom-0 left-0 right-0',
        'h-player z-sticky',
        // Surface + separator
        'bg-surface-abyss border-t border-subtle',
        // Layout — on lg+ push content past sidebar (240px + 16px = 256px)
        'flex items-center gap-4 px-4 lg:pl-64',
      )}
    >
      {/* ── Láseres ambientales en idle ─────────────────────────────────
          Barrido teal continuo (7s lineal — sin destellos, WCAG 2.3.1)
          mientras no hay pista activa. currentTrack ya se lee arriba: no es
          una suscripción nueva. El root es fixed: ya actúa como containing
          block para esta capa. */}
      {!currentTrack && !reducedMotion && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <span className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-transparent via-teal-500/15 to-transparent animate-laser-scan" />
          <span
            className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-transparent via-teal-300/10 to-transparent animate-laser-scan"
            style={{ animationDelay: '3.5s' }}
          />
        </div>
      )}

      {/* ── Artwork ─────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="shrink-0 h-12 w-12 overflow-hidden rounded-sm bg-surface-rack flex items-center justify-center"
      >
        {currentTrack?.coverUrl ? (
          <Image
            src={currentTrack.coverUrl}
            alt={`Cover for ${currentTrack.albumTitle} by ${currentTrack.artist.name}`}
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
        ) : (
          <Music aria-hidden="true" className="h-5 w-5 text-disabled" />
        )}
      </div>

      {/* ── Track info ──────────────────────────────────────────────── */}
      <div className="min-w-0 flex-1">
        {currentTrack ? (
          <>
            {/* Title with active indicator dot */}
            <div className="flex items-center gap-1.5">
              {isPlaying && (
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500"
                />
              )}
              <p
                className="truncate font-sans text-sm font-medium text-primary"
                aria-live="polite"
                aria-atomic="true"
                aria-label={`Now playing: ${currentTrack.title}`}
              >
                {currentTrack.title}
              </p>
            </div>
            {/* Artist · Album */}
            <p className="truncate font-sans text-xs text-secondary">
              {currentTrack.artist.name}
              <span aria-hidden="true"> · </span>
              {currentTrack.albumTitle}
            </p>
          </>
        ) : (
          <p
            className="flex items-center gap-2 font-sans text-sm text-disabled"
            aria-live="polite"
            aria-label="No track currently playing"
          >
            <CircleSlash aria-hidden="true" className="h-4 w-4" />
            Nothing playing
          </p>
        )}
      </div>

      {/* ── Progress (md+) ──────────────────────────────────────────── */}
      <div
        className="hidden md:flex w-40 shrink-0 flex-col items-center gap-1"
        aria-label="Track progress"
      >
        <ProgressBar
          value={progressPercent}
          variant={isPlaying ? 'download' : 'default'}
          size="sm"
          animated={isPlaying}
          label={`Track progress: ${progressPercent}%`}
        />

        {/* Elapsed / Total */}
        <div className="flex items-center gap-2 font-mono text-xs text-secondary">
          <span aria-label={`${formatDuration(progressSec)} elapsed`}>
            {formatDuration(progressSec)}
          </span>
          <span aria-hidden="true">/</span>
          <span
            aria-label={
              currentTrack
                ? `${formatDuration(currentTrack.durationSeconds)} total`
                : ''
            }
          >
            {currentTrack ? formatDuration(currentTrack.durationSeconds) : '0:00'}
          </span>
        </div>
      </div>

      {/* ── Volume indicator (lg+) ──────────────────────────────────── */}
      <div className="hidden lg:flex shrink-0 items-center gap-1" aria-label="Volume">
        <span aria-hidden="true" className="font-mono text-xs text-disabled">Vol:</span>
        <span className="font-mono text-xs text-secondary w-8 text-right">
          {Math.round(volume * 100)}%
        </span>
      </div>

      {/* ── "Próximamente" badge — reproducción real aún no implementada (TD-12) ── */}
      <span
        aria-hidden="true"
        className="hidden sm:inline-flex shrink-0 items-center rounded-full border border-subtle bg-surface-rack px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-disabled"
      >
        Próximamente
      </span>
    </div>
  )
}
