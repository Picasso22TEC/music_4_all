'use client'

import {
  FastForward,
  Music,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Rewind,
  Shuffle,
  SkipBack,
  SkipForward,
  Square,
} from 'lucide-react'

import { cn } from '@/shared/lib/cn'
import { formatDuration } from '@/shared/lib/format'
import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
import { usePlayerStore, selectHasNext, selectHasPrevious } from '@/features/player'

import { CassetteDeck } from './CassetteDeck'

// ─── Tecla del Walkman (botón táctil embosado) ────────────────────────────────

function Key({
  onClick,
  disabled,
  active,
  label,
  size = 'md',
  primary,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  active?: boolean
  label: string
  size?: 'sm' | 'md'
  primary?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md border',
        'transition-transform duration-100 ease-out active:translate-y-0.5',
        'focus-visible:outline-none focus-visible:shadow-glow-focus',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0',
        size === 'sm' ? 'h-7 w-7' : 'h-9 w-9',
        primary
          ? 'border-teal-700 bg-teal-500 text-surface-void shadow-glow-active hover:bg-teal-400'
          : cn(
              'border-line bg-surface-rack shadow-sm',
              active ? 'text-teal-400' : 'text-secondary hover:text-primary hover:border-teal-700',
            ),
      )}
    >
      {children}
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

const SEEK_STEP = 10 // segundos que avanza/retrocede ⏪ / ⏩

/**
 * Reproductor "Now Playing" con forma de Walkman, anclado en la zona baja del
 * Sidebar (persistente en toda la app). Consume player.store. El cassette gira
 * mientras suena (gateado por reduced-motion) y el título va escrito en plumón
 * sobre la etiqueta. Solo desktop (lg+): en móvil el sidebar se oculta y el
 * reproductor cae en la mini-barra inferior (PlayerBar).
 */
export function SidebarWalkman() {
  const current       = usePlayerStore((s) => s.current)
  const isPlaying     = usePlayerStore((s) => s.isPlaying)
  const progressSec   = usePlayerStore((s) => s.progressSeconds)
  const durationSec   = usePlayerStore((s) => s.durationSeconds)
  const shuffle       = usePlayerStore((s) => s.shuffle)
  const repeat        = usePlayerStore((s) => s.repeat)
  const toggle        = usePlayerStore((s) => s.toggle)
  const seek          = usePlayerStore((s) => s.seek)
  const next          = usePlayerStore((s) => s.next)
  const previous      = usePlayerStore((s) => s.previous)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
  const cycleRepeat   = usePlayerStore((s) => s.cycleRepeat)
  const stop          = usePlayerStore((s) => s.stop)
  const hasNext       = usePlayerStore(selectHasNext)
  const hasPrevious   = usePlayerStore(selectHasPrevious)
  const reducedMotion = useReducedMotion()

  const hasTrack = current !== null
  const max = durationSec > 0 ? durationSec : 0
  const progressPercent = max > 0 ? Math.min(100, Math.max(0, (progressSec / max) * 100)) : 0
  const repeatLabel = repeat === 'one' ? 'Repeat one' : repeat === 'all' ? 'Repeat all' : 'Repeat off'

  return (
    <section
      aria-label="Now playing"
      className="shrink-0 border-t border-subtle bg-surface-console/60 px-3 py-3"
    >
      {/* ── Cassette con carretes girando + título en plumón ──────────── */}
      <CassetteDeck
        spinning={isPlaying && !reducedMotion}
        title={current?.title}
        className="w-full"
      />

      {/* ── Meta: artista + tiempo ───────────────────────────────────── */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {isPlaying && hasTrack && (
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500"
            />
          )}
          {hasTrack ? (
            <p className="truncate font-sans text-xs text-secondary">{current.artist}</p>
          ) : (
            <p className="flex items-center gap-1.5 font-sans text-xs text-disabled">
              <Music aria-hidden="true" className="h-3.5 w-3.5" />
              Nothing playing
            </p>
          )}
        </div>
        {hasTrack && (
          <span className="shrink-0 font-mono text-2xs text-secondary tabular-nums">
            {formatDuration(progressSec)} / {formatDuration(max)}
          </span>
        )}
      </div>

      {/* ── Barra de progreso / seek ─────────────────────────────────── */}
      <input
        type="range"
        min={0}
        max={max || 100}
        step={1}
        value={Math.min(progressSec, max || 0)}
        onChange={(e) => seek(Number(e.currentTarget.value))}
        disabled={!hasTrack || max === 0}
        aria-label="Seek"
        className="player-range mt-2 h-1 w-full"
        style={{ ['--range-fill' as string]: `${progressPercent}%` }}
      />

      {/* ── Transporte primario ──────────────────────────────────────── */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <Key onClick={previous} disabled={!hasPrevious} label="Previous track">
          <SkipBack aria-hidden="true" className="h-4 w-4" />
        </Key>
        <Key
          onClick={toggle}
          disabled={!hasTrack}
          primary
          label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Play aria-hidden="true" className="h-4 w-4 translate-x-px" />
          )}
        </Key>
        <Key onClick={next} disabled={!hasNext} label="Next track">
          <SkipForward aria-hidden="true" className="h-4 w-4" />
        </Key>
      </div>

      {/* ── Transporte secundario: shuffle · ⏪ · STOP · ⏩ · repeat ──── */}
      <div className="mt-2 flex items-center justify-center gap-1.5">
        <Key
          onClick={toggleShuffle}
          disabled={!hasTrack}
          active={shuffle}
          size="sm"
          label={shuffle ? 'Shuffle on' : 'Shuffle off'}
        >
          <Shuffle aria-hidden="true" className="h-3.5 w-3.5" />
        </Key>
        <Key
          onClick={() => seek(Math.max(0, progressSec - SEEK_STEP))}
          disabled={!hasTrack || max === 0}
          size="sm"
          label="Rewind 10 seconds"
        >
          <Rewind aria-hidden="true" className="h-3.5 w-3.5" />
        </Key>
        <Key onClick={stop} disabled={!hasTrack} size="sm" label="Stop">
          <Square aria-hidden="true" className="h-3 w-3" />
        </Key>
        <Key
          onClick={() => seek(Math.min(max, progressSec + SEEK_STEP))}
          disabled={!hasTrack || max === 0}
          size="sm"
          label="Fast-forward 10 seconds"
        >
          <FastForward aria-hidden="true" className="h-3.5 w-3.5" />
        </Key>
        <Key
          onClick={cycleRepeat}
          disabled={!hasTrack}
          active={repeat !== 'off'}
          size="sm"
          label={repeatLabel}
        >
          {repeat === 'one' ? (
            <Repeat1 aria-hidden="true" className="h-3.5 w-3.5" />
          ) : (
            <Repeat aria-hidden="true" className="h-3.5 w-3.5" />
          )}
        </Key>
      </div>

      {/* Anuncio accesible del track actual */}
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {hasTrack ? `Now playing: ${current.title} by ${current.artist}` : 'Nothing playing'}
      </p>
    </section>
  )
}
