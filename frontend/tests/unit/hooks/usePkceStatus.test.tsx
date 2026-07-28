import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { authApi } from '@/features/auth/api/auth.api'
import { useAuthStore } from '@/features/auth/model/auth.store'
import {
  useHiFiConnected,
  useLockedDownloadQualities,
} from '@/features/auth/model/pkce.queries'

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: { pkceStatus: vi.fn() },
}))

const mockStatus = vi.mocked(authApi.pkceStatus)

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

function setAuthenticated() {
  useAuthStore.setState({
    status: 'authenticated',
    user: { id: 'u1', email: 'a@b.c', countryCode: 'US', plan: 'HIFI' },
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  })
}

beforeEach(() => {
  mockStatus.mockReset()
  useAuthStore.setState({ status: 'unauthenticated', user: null, expiresAt: null })
})

afterEach(() => {
  useAuthStore.setState({ status: 'unauthenticated', user: null, expiresAt: null })
})

describe('PKCE status hooks', () => {
  it('does not query while unauthenticated (no 401 storm)', async () => {
    renderHook(() => useHiFiConnected(), { wrapper: makeWrapper() })
    await Promise.resolve()
    expect(mockStatus).not.toHaveBeenCalled()
  })

  it('unlocks 16-bit when the Hi-Fi session is connected', async () => {
    setAuthenticated()
    mockStatus.mockResolvedValue(true)
    const { result } = renderHook(() => useLockedDownloadQualities(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current).toEqual([]))
  })

  it('locks 16-bit (HIGH) when the Hi-Fi session is not connected', async () => {
    setAuthenticated()
    mockStatus.mockResolvedValue(false)
    const { result } = renderHook(() => useLockedDownloadQualities(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current).toEqual(['HIGH']))
  })
})
