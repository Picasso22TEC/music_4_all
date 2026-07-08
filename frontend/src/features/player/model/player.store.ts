import { create } from 'zustand'

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A playable source for the audio player. Built from a completed download
 * (see DownloadPanel) — `src` is the streaming URL of the downloaded file.
 */
export interface PlayerTrack {
  id: string
  title: string
  artist: string
  album?: string
  coverUrl?: string | null
  /** Audio URL fed to the <audio> element (e.g. /api/download/file/{jobId}). */
  src: string
}

interface PlayerState {
  current: PlayerTrack | null
  isPlaying: boolean
  progressSeconds: number
  /** From the <audio> element's loadedmetadata — 0 until known. */
  durationSeconds: number
  volume: number // 0–1
}

interface PlayerActions {
  play: (track: PlayerTrack) => void
  toggle: () => void
  pause: () => void
  resume: () => void
  seek: (seconds: number) => void
  setVolume: (v: number) => void
  setProgress: (seconds: number) => void
  setDuration: (seconds: number) => void
  stop: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────
//
// Pure state. The actual playback lives in AudioController, which owns the one
// <audio> element, applies this state to it, and writes progress/duration back.

export const usePlayerStore = create<PlayerState & PlayerActions>((set) => ({
  current: null,
  isPlaying: false,
  progressSeconds: 0,
  durationSeconds: 0,
  volume: 0.8,

  play: (track) =>
    set({ current: track, isPlaying: true, progressSeconds: 0, durationSeconds: 0 }),

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

  stop: () => set({ current: null, isPlaying: false, progressSeconds: 0, durationSeconds: 0 }),
}))

// ─── Selectors ──────────────────────────────────────────────────────────────

export const selectIsPlayerActive = (s: PlayerState): boolean => s.isPlaying
