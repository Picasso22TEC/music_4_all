import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useMediaSession } from '@/features/player/lib/useMediaSession'
import { usePlayerStore } from '@/features/player/model/player.store'
import type { PlayerTrack } from '@/features/player/model/player.store'

class FakeMediaMetadata {
  title?: string
  artist?: string
  album?: string
  artwork?: unknown
  constructor(init: Record<string, unknown>) {
    Object.assign(this, init)
  }
}

const setActionHandler = vi.fn()
const handlers: Record<string, (() => void) | null> = {}

const TRACK: PlayerTrack = {
  id: 't1',
  title: 'Bohemian Rhapsody',
  artist: 'Queen',
  album: 'A Night at the Opera',
  coverUrl: 'https://cover/1.jpg',
  src: '/api/download/stream/t1',
}

beforeEach(() => {
  setActionHandler.mockReset()
  setActionHandler.mockImplementation((action: string, fn: (() => void) | null) => {
    handlers[action] = fn
  })
  ;(globalThis as unknown as { MediaMetadata: unknown }).MediaMetadata = FakeMediaMetadata
  Object.defineProperty(navigator, 'mediaSession', {
    value: { metadata: null, playbackState: 'none', setActionHandler },
    configurable: true,
    writable: true,
  })
  usePlayerStore.setState({ current: TRACK, isPlaying: true, queue: [TRACK], order: [0], orderPos: 0 })
})

afterEach(() => {
  usePlayerStore.getState().stop()
})

describe('useMediaSession', () => {
  it('publishes track metadata and playing state', () => {
    renderHook(() => useMediaSession())
    const ms = navigator.mediaSession as unknown as { metadata: FakeMediaMetadata; playbackState: string }
    expect(ms.metadata.title).toBe('Bohemian Rhapsody')
    expect(ms.metadata.artist).toBe('Queen')
    expect(ms.playbackState).toBe('playing')
  })

  it('registers OS media controls wired to the player store', () => {
    renderHook(() => useMediaSession())
    expect(setActionHandler).toHaveBeenCalledWith('play', expect.any(Function))
    expect(setActionHandler).toHaveBeenCalledWith('pause', expect.any(Function))
    expect(setActionHandler).toHaveBeenCalledWith('nexttrack', expect.any(Function))

    // El handler de "pause" debe pausar el store.
    handlers['pause']?.()
    expect(usePlayerStore.getState().isPlaying).toBe(false)
  })

  it('does nothing when the browser lacks mediaSession support', () => {
    Object.defineProperty(navigator, 'mediaSession', { value: undefined, configurable: true })
    expect(() => renderHook(() => useMediaSession())).not.toThrow()
  })
})
