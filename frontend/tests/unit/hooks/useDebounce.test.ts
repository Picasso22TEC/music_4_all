import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDebounce } from '@/shared/hooks/useDebounce'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300))
    expect(result.current).toBe('initial')
  })

  it('does not update the value before the delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } },
    )

    rerender({ value: 'updated' })

    // Advance time by less than the delay
    act(() => vi.advanceTimersByTime(299))
    expect(result.current).toBe('initial')
  })

  it('updates the value once the delay has fully elapsed', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } },
    )

    rerender({ value: 'updated' })
    act(() => vi.advanceTimersByTime(300))
    expect(result.current).toBe('updated')
  })

  it('resets the timer on each intermediate change (debounce behaviour)', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } },
    )

    rerender({ value: 'b' })
    act(() => vi.advanceTimersByTime(200))  // 200ms — timer not done

    rerender({ value: 'c' })               // restarts the 300ms window
    act(() => vi.advanceTimersByTime(299)) // 499ms total, but only 299ms since last change
    expect(result.current).toBe('a')       // still the original value

    act(() => vi.advanceTimersByTime(1))   // 300ms since last change → fires
    expect(result.current).toBe('c')       // skipped 'b', landed on 'c'
  })

  it('works with numeric values', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) => useDebounce(value, 500),
      { initialProps: { value: 0 } },
    )

    rerender({ value: 42 })
    act(() => vi.advanceTimersByTime(500))
    expect(result.current).toBe(42)
  })

  it('works with object values', () => {
    const initial = { q: 'foo' }
    const updated = { q: 'bar' }

    const { result, rerender } = renderHook(
      ({ value }: { value: typeof initial }) => useDebounce(value, 300),
      { initialProps: { value: initial } },
    )

    rerender({ value: updated })
    act(() => vi.advanceTimersByTime(300))
    expect(result.current).toEqual(updated)
  })
})
