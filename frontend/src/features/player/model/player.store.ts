import { create } from 'zustand'

import type { Track } from '@/entities'

interface PlayerState {
  currentTrack: Track | null
  isPlaying: boolean
  progressSeconds: number
  volume: number          // 0–1
  queue: Track[]
  queueIndex: number
}

interface PlayerActions {
  play: (track: Track, queue?: Track[]) => void
  pause: () => void
  resume: () => void
  next: () => void
  previous: () => void
  seek: (seconds: number) => void
  setVolume: (v: number) => void
  setProgress: (seconds: number) => void
}

export const usePlayerStore = create<PlayerState & PlayerActions>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  progressSeconds: 0,
  volume: 0.8,
  queue: [],
  queueIndex: 0,

  play: (track, queue) => {
    const effectiveQueue = queue ?? [track]
    set({
      currentTrack: track,
      isPlaying: true,
      progressSeconds: 0,
      queue: effectiveQueue,
      queueIndex: effectiveQueue.findIndex((t) => t.id === track.id),
    })
  },

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),

  next: () => {
    const { queue, queueIndex } = get()
    const next = queueIndex + 1
    if (next < queue.length) {
      set({ currentTrack: queue[next], queueIndex: next, progressSeconds: 0 })
    }
  },

  previous: () => {
    const { queue, queueIndex, progressSeconds } = get()
    if (progressSeconds > 3) {
      set({ progressSeconds: 0 })
      return
    }
    const prev = queueIndex - 1
    if (prev >= 0) set({ currentTrack: queue[prev], queueIndex: prev, progressSeconds: 0 })
  },

  seek: (progressSeconds) => set({ progressSeconds }),
  setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)) }),
  setProgress: (progressSeconds) => set({ progressSeconds }),
}))

// Selectors
export const selectIsPlayerActive = (s: PlayerState) => s.isPlaying
export const selectCurrentTrack = (s: PlayerState) => s.currentTrack
export const selectProgressPercent = (s: PlayerState): number => {
  if (!s.currentTrack) return 0
  return (s.progressSeconds / s.currentTrack.durationSeconds) * 100
}
