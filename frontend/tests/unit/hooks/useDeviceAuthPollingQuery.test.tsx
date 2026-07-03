import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { authApi } from '@/features/auth/api/auth.api'
import { useDeviceAuthPollingQuery } from '@/features/auth/model/auth.queries'

// Only pollDeviceAuth is exercised here.
vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: { pollDeviceAuth: vi.fn() },
}))

const mockPoll = vi.mocked(authApi.pollDeviceAuth)

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

const INTERVAL = 50

beforeEach(() => {
  vi.useFakeTimers()
  mockPoll.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useDeviceAuthPollingQuery', () => {
  it('does not poll while deviceCode is null (enabled: false)', async () => {
    renderHook(() => useDeviceAuthPollingQuery(null, INTERVAL), { wrapper: makeWrapper() })

    await vi.advanceTimersByTimeAsync(INTERVAL * 3)
    expect(mockPoll).not.toHaveBeenCalled()
  })

  it('keeps polling while the status stays pending', async () => {
    mockPoll.mockResolvedValue({ status: 'pending' })
    renderHook(() => useDeviceAuthPollingQuery('device-x', INTERVAL), { wrapper: makeWrapper() })

    await vi.advanceTimersByTimeAsync(0) // initial fetch on mount
    expect(mockPoll).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(INTERVAL)
    expect(mockPoll).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(INTERVAL)
    expect(mockPoll).toHaveBeenCalledTimes(3)
  })

  it('stops polling once the poll errors (HTTP 400 expired/denied)', async () => {
    // Backend returns 400 DEVICE_AUTH_EXPIRED for expired/denied → surfaces as a
    // query error, NOT as data. The refetchInterval guard must halt on error.
    mockPoll.mockRejectedValue(new Error('DEVICE_AUTH_EXPIRED'))
    renderHook(() => useDeviceAuthPollingQuery('device-x', INTERVAL), { wrapper: makeWrapper() })

    await vi.advanceTimersByTimeAsync(0)
    expect(mockPoll).toHaveBeenCalledTimes(1)

    // Several intervals later: no further polling.
    await vi.advanceTimersByTimeAsync(INTERVAL * 5)
    expect(mockPoll).toHaveBeenCalledTimes(1)
  })

  it('stops polling once status is authorized', async () => {
    mockPoll.mockResolvedValue({
      status: 'authorized',
      user: { id: 'u1', email: 'a@b.c', countryCode: 'US', plan: 'HIFI_PLUS' },
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    })
    renderHook(() => useDeviceAuthPollingQuery('device-x', INTERVAL), { wrapper: makeWrapper() })

    await vi.advanceTimersByTimeAsync(0)
    expect(mockPoll).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(INTERVAL * 5)
    expect(mockPoll).toHaveBeenCalledTimes(1)
  })
})
