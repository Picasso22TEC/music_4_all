import { create } from 'zustand'

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A playable source for the audio player. Built from a completed download or a
 * Tidal track — `src` is the streaming URL (`/api/download/stream/{trackId}`)
 * or the downloaded-file URL (`/api/download/file/{jobId}`).
 */
export interface PlayerTrack {
  id: string
  title: string
  artist: string
  album?: string
  coverUrl?: string | null
  src: string
}

export type RepeatMode = 'off' | 'all' | 'one'

interface PlayerState {
  /** The queue of tracks (in the order they were enqueued). */
  queue: PlayerTrack[]
  /** Play order: a permutation of queue indices (identity when not shuffled). */
  order: number[]
  /** Position within `order`; -1 when the queue is empty. */
  orderPos: number
  /** Currently playing track = queue[order[orderPos]] (kept in sync). */
  current: PlayerTrack | null
  isPlaying: boolean
  progressSeconds: number
  /** From the <audio> element's loadedmetadata — 0 until known. */
  durationSeconds: number
  volume: number // 0–1
  shuffle: boolean
  repeat: RepeatMode
}

interface PlayerActions {
  /** Play a single track (a queue of one). */
  play: (track: PlayerTrack) => void
  /** Replace the queue and start playing at `startIndex` (respects shuffle). */
  playQueue: (tracks: PlayerTrack[], startIndex?: number) => void
  /** Jump to a specific queue index. */
  playAt: (index: number) => void
  next: () => void
  previous: () => void
  toggle: () => void
  pause: () => void
  resume: () => void
  seek: (seconds: number) => void
  setVolume: (v: number) => void
  setProgress: (seconds: number) => void
  setDuration: (seconds: number) => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  stop: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a play order for a queue. Identity when not shuffled; otherwise a
 *  Fisher–Yates shuffle of the other indices with `startIndex` kept first. */
function buildOrder(
  length: number,
  shuffle: boolean,
  startIndex: number,
): { order: number[]; orderPos: number } {
  const identity = Array.from({ length }, (_, i) => i)
  if (!shuffle) return { order: identity, orderPos: startIndex }
  const rest = identity.filter((i) => i !== startIndex)
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  return { order: [startIndex, ...rest], orderPos: 0 }
}

function trackAt(queue: PlayerTrack[], order: number[], orderPos: number): PlayerTrack | null {
  const idx = order[orderPos]
  return idx != null && queue[idx] ? queue[idx] : null
}

// ─── Store ────────────────────────────────────────────────────────────────────
//
// Pure state. The actual playback lives in AudioController, which owns the one
// <audio> element, applies this state to it, and writes progress/duration back.

export const usePlayerStore = create<PlayerState & PlayerActions>((set, get) => ({
  queue: [],
  order: [],
  orderPos: -1,
  current: null,
  isPlaying: false,
  progressSeconds: 0,
  durationSeconds: 0,
  volume: 0.8,
  shuffle: false,
  repeat: 'off',

  play: (track) => get().playQueue([track], 0),

  playQueue: (tracks, startIndex = 0) => {
    if (tracks.length === 0) return
    const start = Math.max(0, Math.min(startIndex, tracks.length - 1))
    const { order, orderPos } = buildOrder(tracks.length, get().shuffle, start)
    set({
      queue: tracks,
      order,
      orderPos,
      current: trackAt(tracks, order, orderPos),
      isPlaying: true,
      progressSeconds: 0,
      durationSeconds: 0,
    })
  },

  playAt: (index) => {
    const { order, queue } = get()
    const pos = order.indexOf(index)
    if (pos === -1) return
    set({
      orderPos: pos,
      current: trackAt(queue, order, pos),
      isPlaying: true,
      progressSeconds: 0,
      durationSeconds: 0,
    })
  },

  next: () => {
    const { order, orderPos, queue, repeat } = get()
    if (queue.length === 0) return
    let pos = orderPos + 1
    if (pos >= order.length) {
      if (repeat === 'all') pos = 0
      else {
        // End of queue with no repeat: stop advancing, keep the last track.
        set({ isPlaying: false })
        return
      }
    }
    set({
      orderPos: pos,
      current: trackAt(queue, order, pos),
      isPlaying: true,
      progressSeconds: 0,
      durationSeconds: 0,
    })
  },

  previous: () => {
    const { order, orderPos, queue, progressSeconds, repeat } = get()
    if (queue.length === 0) return
    // Past 3 s, "previous" restarts the current track (streaming-app convention).
    if (progressSeconds > 3) {
      set({ progressSeconds: 0 })
      return
    }
    let pos = orderPos - 1
    if (pos < 0) {
      if (repeat === 'all') pos = order.length - 1
      else {
        set({ progressSeconds: 0 })
        return
      }
    }
    set({
      orderPos: pos,
      current: trackAt(queue, order, pos),
      isPlaying: true,
      progressSeconds: 0,
      durationSeconds: 0,
    })
  },

  toggle: () => set((s) => (s.current ? { isPlaying: !s.isPlaying } : {})),
  pause: () => set({ isPlaying: false }),
  resume: () => set((s) => (s.current ? { isPlaying: true } : {})),

  // seek and setProgress both write progressSeconds; AudioController reconciles a
  // user seek (a large jump from the element's currentTime) vs. the small steps
  // it reports from timeupdate.
  seek: (progressSeconds) => set({ progressSeconds }),
  setProgress: (progressSeconds) => set({ progressSeconds }),

  setDuration: (durationSeconds) => set({ durationSeconds }),
  setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)) }),

  toggleShuffle: () => {
    const { shuffle, queue, order, orderPos } = get()
    const nextShuffle = !shuffle
    const currentQueueIndex = order[orderPos] ?? 0
    const { order: newOrder, orderPos: newPos } = buildOrder(
      queue.length,
      nextShuffle,
      currentQueueIndex,
    )
    // The current track stays the same; only the future order changes.
    set({ shuffle: nextShuffle, order: newOrder, orderPos: newPos })
  },

  cycleRepeat: () =>
    set((s) => ({ repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off' })),

  stop: () =>
    set({
      queue: [],
      order: [],
      orderPos: -1,
      current: null,
      isPlaying: false,
      progressSeconds: 0,
      durationSeconds: 0,
    }),
}))

// ─── Selectors ──────────────────────────────────────────────────────────────

export const selectIsPlayerActive = (s: PlayerState): boolean => s.isPlaying
export const selectHasNext = (s: PlayerState): boolean =>
  s.queue.length > 0 && (s.repeat === 'all' || s.orderPos < s.order.length - 1)
export const selectHasPrevious = (s: PlayerState): boolean =>
  s.queue.length > 0 && (s.repeat === 'all' || s.orderPos > 0)
