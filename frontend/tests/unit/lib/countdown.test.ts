import { describe, expect, it } from 'vitest'

import { computeRemainingMs, formatMmSs } from '@/features/auth/model/countdown'

describe('computeRemainingMs', () => {
  it('returns the full duration at issue time', () => {
    expect(computeRemainingMs(1_000, 300, 1_000)).toBe(300_000)
  })

  it('decreases as wall-clock time passes (from absolute issuedAt)', () => {
    expect(computeRemainingMs(0, 300, 60_000)).toBe(240_000)
  })

  it('never returns a negative value once expired', () => {
    expect(computeRemainingMs(0, 300, 999_999_999)).toBe(0)
  })
})

describe('formatMmSs', () => {
  it('formats minutes and seconds zero-padded', () => {
    expect(formatMmSs(300_000)).toBe('05:00')
  })

  it('rounds partial seconds up so it never shows 00:00 before expiry', () => {
    expect(formatMmSs(500)).toBe('00:01')
  })

  it('shows 00:00 exactly at zero', () => {
    expect(formatMmSs(0)).toBe('00:00')
  })

  it('formats a mid-range value', () => {
    expect(formatMmSs(125_000)).toBe('02:05')
  })
})
