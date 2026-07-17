import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useIdleTimeout } from '@/features/auth/model/useIdleTimeout'
import { useAuthStore } from '@/features/auth/model/auth.store'

// El hook decide CUÁNDO avisar y cerrar; la petición es de la capa api.
const mockKeepalive = vi.fn().mockResolvedValue({ idleTtlSeconds: 1800, expiresInSeconds: 1800 })
const mockLogout = vi.fn().mockResolvedValue(undefined)
vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: {
    keepalive: () => mockKeepalive(),
    logout: () => mockLogout(),
  },
}))

const IDLE_MS = 30 * 60_000
const WARN_MS = 2 * 60_000

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

function interact() {
  act(() => {
    window.dispatchEvent(new Event('pointerdown'))
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  mockKeepalive.mockClear()
  mockLogout.mockClear()
  useAuthStore.setState({ status: 'authenticated', endReason: null })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useIdleTimeout', () => {
  it('says nothing while the user is within the window', () => {
    const { result } = renderHook(() => useIdleTimeout(true))
    advance(IDLE_MS - WARN_MS - 1_000)
    expect(result.current.isWarning).toBe(false)
    expect(useAuthStore.getState().status).toBe('authenticated')
  })

  it('warns before closing, not after', () => {
    const { result } = renderHook(() => useIdleTimeout(true))
    advance(IDLE_MS - WARN_MS + 1_000)

    expect(result.current.isWarning).toBe(true)
    expect(result.current.secondsLeft).toBeLessThanOrEqual(120)
    expect(useAuthStore.getState().status).toBe('authenticated') // aún no cierra
  })

  it('closes the session for real once the window runs out', async () => {
    renderHook(() => useIdleTimeout(true))
    advance(IDLE_MS + 1_000)
    await act(async () => {})

    // Logout de verdad: borra la sesión en Redis y la cookie, no solo el estado local.
    expect(mockLogout).toHaveBeenCalledTimes(1)
    expect(useAuthStore.getState().status).toBe('expired')
    expect(useAuthStore.getState().endReason).toBe('idle')
  })

  it('a real interaction resets the countdown', () => {
    const { result } = renderHook(() => useIdleTimeout(true))
    advance(IDLE_MS - WARN_MS + 1_000)
    expect(result.current.isWarning).toBe(true)

    interact()
    expect(result.current.isWarning).toBe(false)

    advance(IDLE_MS - WARN_MS - 1_000)
    expect(useAuthStore.getState().status).toBe('authenticated')
  })

  it('tells the server the user is still here (background polls no longer do)', () => {
    renderHook(() => useIdleTimeout(true))
    expect(mockKeepalive).toHaveBeenCalledTimes(1) // al montar

    // Interacción constante: se reporta como mucho cada 5 min, no en cada gesto.
    interact()
    interact()
    expect(mockKeepalive).toHaveBeenCalledTimes(1)

    advance(5 * 60_000)
    interact()
    expect(mockKeepalive).toHaveBeenCalledTimes(2)
  })

  it('"stay signed in" renews immediately', () => {
    const { result } = renderHook(() => useIdleTimeout(true))
    advance(IDLE_MS - WARN_MS + 1_000)

    act(() => result.current.staySignedIn())

    expect(result.current.isWarning).toBe(false)
    expect(mockKeepalive).toHaveBeenCalledTimes(2) // no espera al throttle
  })

  it('does nothing at all when the user is not signed in', () => {
    renderHook(() => useIdleTimeout(false))
    advance(IDLE_MS + 1_000)

    expect(mockKeepalive).not.toHaveBeenCalled()
    expect(mockLogout).not.toHaveBeenCalled()
  })
})
