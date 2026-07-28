import { describe, expect, it } from 'vitest'

import { urlBase64ToUint8Array } from '@/features/push/lib/vapid'

describe('urlBase64ToUint8Array', () => {
  it('decodes a VAPID applicationServerKey to a 65-byte P-256 point', () => {
    const key =
      'BHp8HMF-yk76h0FI-DQ3RtBiu-Q5S2xOLymFgzRX9m6YjEKq2cycr2DJL14epx4uYU2hqPphWZPWh2_TaUYCmQE'
    const bytes = urlBase64ToUint8Array(key)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBe(65)
    expect(bytes[0]).toBe(0x04) // marcador de punto EC sin comprimir
  })

  it('handles url-safe chars and missing padding', () => {
    const bytes = urlBase64ToUint8Array('aGVsbG8') // "hello" sin padding
    expect(new TextDecoder().decode(bytes)).toBe('hello')
  })
})
