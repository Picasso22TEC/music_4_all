'use client'

import { useEffect, useRef } from 'react'

import { usePlayerStore } from '../model/player.store'

/**
 * The single, session-wide <audio> element that actually plays audio.
 *
 * Mounted once in (app)/layout.tsx. It is the bridge between player.store
 * (pure state) and the DOM audio element:
 *   store → element: load new src, play/pause, volume, reconcile user seeks
 *   element → store: progress (timeupdate), duration (loadedmetadata), ended
 *
 * The element is visually hidden (no native controls) — the UI is PlayerBar.
 */
export function AudioController() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const loadedIdRef = useRef<string | null>(null)

  const current = usePlayerStore((s) => s.current)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const volume = usePlayerStore((s) => s.volume)
  const progressSeconds = usePlayerStore((s) => s.progressSeconds)

  // ── Load a new source only when the track actually changes ──────────────────
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (current && current.id !== loadedIdRef.current) {
      loadedIdRef.current = current.id
      audio.src = current.src
      audio.load()
    } else if (!current && loadedIdRef.current !== null) {
      loadedIdRef.current = null
      audio.removeAttribute('src')
      audio.load()
    }
  }, [current])

  // ── Play / pause follows the store's intent ─────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !current) return
    if (isPlaying) {
      // play() rejects on autoplay policy or an undecodable file — reflect that
      // back so the UI doesn't show a stuck "playing" state.
      audio.play().catch(() => usePlayerStore.getState().pause())
    } else {
      audio.pause()
    }
  }, [isPlaying, current])

  // ── Volume ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  // ── Reconcile user seeks — only a large jump from the element's own clock ───
  // timeupdate writes progressSeconds ≈ currentTime, so this stays a no-op during
  // normal playback and only fires when the user drags the seek bar.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (Math.abs(audio.currentTime - progressSeconds) > 0.75) {
      audio.currentTime = progressSeconds
    }
  }, [progressSeconds])

  return (
    <audio
      ref={audioRef}
      preload="metadata"
      className="hidden"
      aria-hidden="true"
      onTimeUpdate={(e) => usePlayerStore.getState().setProgress(e.currentTarget.currentTime)}
      onLoadedMetadata={(e) => usePlayerStore.getState().setDuration(e.currentTarget.duration)}
      onEnded={(e) => {
        const st = usePlayerStore.getState()
        if (st.repeat === 'one') {
          // Replay the same track; the store's isPlaying stays true so the
          // play/pause effect won't re-fire — restart the element directly.
          e.currentTarget.currentTime = 0
          void e.currentTarget.play()
          return
        }
        // Advance; next() handles repeat 'all' (wrap) and end-of-queue (stop).
        st.next()
      }}
    />
  )
}
