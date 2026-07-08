'use client'

import Image from 'next/image'
import { CircleSlash, Music, Pause, Play, Volume2 } from 'lucide-react'

import { cn } from '@/shared/lib/cn'
import { formatDuration } from '@/shared/lib/format'
import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
import { usePlayerStore } from '@/features/player'

// ─── Component (wireframes §16) ───────────────────────────────────────────────

export function PlayerBar() {
  const current       = usePlayerStore((s) => s.current)
  const isPlaying     = usePlayerStore((s) => s.isPlaying)
  const progressSec   = usePlayerStore((s) => s.progressSeconds)
  const durationSec   = usePlayerStore((s) => s.durationSeconds)
  const volume        = usePlayerStore((s) => s.volume)
  const toggle        = usePlayerStore((s) => s.toggle)
  const seek          = usePlayerStore((s) => s.seek)
  const setVolume     = usePlayerStore((s) => s.setVolume)
  const reducedMotion = useReducedMotion()

  const hasTrack = current !== null
  const max = durationSec > 0 ? durationSec : 0
  const progressPercent = max > 0 ? Math.min(100, Math.max(0, (progressSec / max) * 100)) : 0

  return (
    <div
      role="region"
      aria-label="Audio player"
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
          mientras no hay pista activa. El root es fixed: ya actúa como
          containing block para esta capa. */}
      {!hasTrack && !reducedMotion && (
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
        {current?.coverUrl ? (
          <Image
            src={current.coverUrl}
            alt=""
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
        {current ? (
          <>
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
                aria-label={`Now playing: ${current.title}`}
              >
                {current.title}
              </p>
            </div>
            <p className="truncate font-sans text-xs text-secondary">
              {current.artist}
              {current.album && (
                <>
                  <span aria-hidden="true"> · </span>
                  {current.album}
                </>
              )}
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

      {/* ── Play / pause ────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={toggle}
        disabled={!hasTrack}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className={cn(
          'shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full',
          'bg-teal-500 text-surface-void',
          'transition-transform duration-150 ease-out active:scale-95',
          'hover:bg-teal-400 focus-visible:outline-none focus-visible:shadow-glow-focus',
          'disabled:cursor-not-allowed disabled:bg-surface-rack disabled:text-disabled',
        )}
      >
        {isPlaying ? (
          <Pause aria-hidden="true" className="h-4 w-4" />
        ) : (
          <Play aria-hidden="true" className="h-4 w-4 translate-x-px" />
        )}
      </button>

      {/* ── Seek bar + times (md+) ──────────────────────────────────── */}
      <div className="hidden md:flex w-56 shrink-0 items-center gap-2">
        <span className="w-9 text-right font-mono text-xs text-secondary tabular-nums">
          {formatDuration(progressSec)}
        </span>
        <input
          type="range"
          min={0}
          max={max || 100}
          step={1}
          value={Math.min(progressSec, max || 0)}
          onChange={(e) => seek(Number(e.currentTarget.value))}
          disabled={!hasTrack || max === 0}
          aria-label="Seek"
          className="player-range h-1 flex-1"
          style={{ ['--range-fill' as string]: `${progressPercent}%` }}
        />
        <span className="w-9 font-mono text-xs text-secondary tabular-nums">
          {formatDuration(max)}
        </span>
      </div>

      {/* ── Volume (lg+) ────────────────────────────────────────────── */}
      <div className="hidden lg:flex shrink-0 items-center gap-2" aria-label="Volume">
        <Volume2 aria-hidden="true" className="h-4 w-4 text-disabled" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.currentTarget.value))}
          aria-label="Volume"
          className="player-range h-1 w-20"
          style={{ ['--range-fill' as string]: `${Math.round(volume * 100)}%` }}
        />
      </div>
    </div>
  )
}
