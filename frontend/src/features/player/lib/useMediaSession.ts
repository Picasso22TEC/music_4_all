'use client'

import { useEffect } from 'react'

import { usePlayerStore } from '../model/player.store'

/**
 * Integra el reproductor con la Media Session API: metadatos (título/artista/
 * carátula) y controles del SO (pantalla de bloqueo, auriculares, teclas de
 * medios). Hace que la PWA se sienta como un reproductor nativo.
 *
 * Se monta una sola vez, dentro de AudioController (que ya es el puente store↔<audio>).
 * Degrada con elegancia: si el navegador no soporta `mediaSession`, no hace nada.
 */
export function useMediaSession(): void {
  const current = usePlayerStore((s) => s.current)
  const isPlaying = usePlayerStore((s) => s.isPlaying)

  // Metadatos + estado de reproducción, cuando cambian la pista o el play/pause.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaSession) return
    const ms = navigator.mediaSession

    if (!current) {
      ms.metadata = null
      ms.playbackState = 'none'
      return
    }

    ms.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist,
      album: current.album ?? '',
      artwork: current.coverUrl
        ? [{ src: current.coverUrl, sizes: '512x512', type: 'image/jpeg' }]
        : [],
    })
    ms.playbackState = isPlaying ? 'playing' : 'paused'
  }, [current, isPlaying])

  // Handlers de acción — se registran una vez; leen el store en el momento de la acción.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaSession) return
    const ms = navigator.mediaSession

    const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(action, handler)
      } catch {
        // El navegador no soporta esta acción — se ignora.
      }
    }

    set('play', () => usePlayerStore.getState().resume())
    set('pause', () => usePlayerStore.getState().pause())
    set('previoustrack', () => usePlayerStore.getState().previous())
    set('nexttrack', () => usePlayerStore.getState().next())

    return () => {
      set('play', null)
      set('pause', null)
      set('previoustrack', null)
      set('nexttrack', null)
    }
  }, [])
}
