import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useUrlDetection } from '@/shared/hooks/useUrlDetection'
import { isValidTidalUrl, getTidalUrlType } from '@/shared/lib/url.utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeClipboardEvent(text: string): React.ClipboardEvent<HTMLInputElement> {
  return {
    clipboardData: { getData: () => text },
    preventDefault: vi.fn(),
  } as unknown as React.ClipboardEvent<HTMLInputElement>
}

// ─── isValidTidalUrl unit tests ───────────────────────────────────────────────

describe('isValidTidalUrl', () => {
  it.each([
    'https://tidal.com/browse/album/251380837',
    'https://tidal.com/browse/track/123456',
    'https://tidal.com/browse/playlist/abc-def',
    'https://listen.tidal.com/album/99999',
  ])('accepts valid Tidal URL: %s', (url) => {
    expect(isValidTidalUrl(url)).toBe(true)
  })

  it.each([
    'https://spotify.com/album/123',
    'https://youtube.com/watch?v=abc',
    'System of a Down',
    '',
    'not-a-url',
    'https://tidal.com',        // path length ≤ 1
    'tidal.com/browse/album/1', // missing scheme — not a valid URL
  ])('rejects non-Tidal or invalid URL: %s', (value) => {
    expect(isValidTidalUrl(value)).toBe(false)
  })
})

// ─── getTidalUrlType unit tests ───────────────────────────────────────────────

describe('getTidalUrlType', () => {
  it('returns "album" for album URLs', () => {
    expect(getTidalUrlType('https://tidal.com/browse/album/251380837')).toBe('album')
  })

  it('returns "track" for track URLs', () => {
    expect(getTidalUrlType('https://tidal.com/browse/track/123456')).toBe('track')
  })

  it('returns "playlist" for playlist URLs', () => {
    expect(getTidalUrlType('https://tidal.com/browse/playlist/abc')).toBe('playlist')
  })

  it('returns null for unrecognised Tidal paths', () => {
    expect(getTidalUrlType('https://tidal.com/browse/artist/42')).toBeNull()
  })

  it('returns null for plain text', () => {
    expect(getTidalUrlType('not-a-url')).toBeNull()
  })
})

// ─── useUrlDetection hook tests ───────────────────────────────────────────────

describe('useUrlDetection', () => {
  function setup() {
    const onUrlDetected = vi.fn()
    const onTextInput = vi.fn()
    const { result } = renderHook(() =>
      useUrlDetection({ onUrlDetected, onTextInput }),
    )
    return { result, onUrlDetected, onTextInput }
  }

  describe('handleChange', () => {
    it('calls onUrlDetected for a valid Tidal album URL', () => {
      const { result, onUrlDetected, onTextInput } = setup()
      result.current.handleChange('https://tidal.com/browse/album/251380837')
      expect(onUrlDetected).toHaveBeenCalledWith('https://tidal.com/browse/album/251380837')
      expect(onTextInput).not.toHaveBeenCalled()
    })

    it('calls onUrlDetected for a valid Tidal track URL', () => {
      const { result, onUrlDetected } = setup()
      result.current.handleChange('https://tidal.com/browse/track/123456')
      expect(onUrlDetected).toHaveBeenCalledWith('https://tidal.com/browse/track/123456')
    })

    it('calls onTextInput for regular search text', () => {
      const { result, onUrlDetected, onTextInput } = setup()
      result.current.handleChange('System of a Down')
      expect(onTextInput).toHaveBeenCalledWith('System of a Down')
      expect(onUrlDetected).not.toHaveBeenCalled()
    })

    it('calls onTextInput for a non-Tidal URL', () => {
      const { result, onUrlDetected, onTextInput } = setup()
      result.current.handleChange('https://spotify.com/album/123')
      expect(onTextInput).toHaveBeenCalledWith('https://spotify.com/album/123')
      expect(onUrlDetected).not.toHaveBeenCalled()
    })

    it('trims whitespace before validating', () => {
      const { result, onUrlDetected } = setup()
      result.current.handleChange('  https://tidal.com/browse/album/1  ')
      expect(onUrlDetected).toHaveBeenCalledWith('https://tidal.com/browse/album/1')
    })
  })

  describe('handlePaste', () => {
    it('calls onUrlDetected and prevents default for a valid Tidal URL', () => {
      const { result, onUrlDetected } = setup()
      const event = makeClipboardEvent('https://tidal.com/browse/album/251380837')

      result.current.handlePaste(event)

      expect(onUrlDetected).toHaveBeenCalledWith('https://tidal.com/browse/album/251380837')
      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('does not intercept paste for plain text', () => {
      const { result, onUrlDetected } = setup()
      const event = makeClipboardEvent('some search text')

      result.current.handlePaste(event)

      expect(onUrlDetected).not.toHaveBeenCalled()
      expect(event.preventDefault).not.toHaveBeenCalled()
    })

    it('does not intercept paste for non-Tidal URLs', () => {
      const { result, onUrlDetected } = setup()
      const event = makeClipboardEvent('https://open.spotify.com/album/xyz')

      result.current.handlePaste(event)

      expect(onUrlDetected).not.toHaveBeenCalled()
      expect(event.preventDefault).not.toHaveBeenCalled()
    })

    it('trims clipboard content before validating', () => {
      const { result, onUrlDetected } = setup()
      const event = makeClipboardEvent('  https://tidal.com/browse/track/999  ')

      result.current.handlePaste(event)

      expect(onUrlDetected).toHaveBeenCalledWith('https://tidal.com/browse/track/999')
    })
  })
})
