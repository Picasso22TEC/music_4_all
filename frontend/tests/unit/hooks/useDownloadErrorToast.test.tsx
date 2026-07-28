import { renderHook } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useDownloadErrorToast } from '@/features/downloads'
import type { ApiError } from '@/shared/lib'

// The hook's job is deciding *what* to say; the Toast rendering is the provider's.
const mockToast = vi.fn()
vi.mock('@/shared/ui', () => ({
  useToast: () => ({ toast: mockToast, dismiss: vi.fn(), dismissAll: vi.fn() }),
}))

function apiError(overrides: Partial<ApiError> = {}): ApiError {
  return {
    code: 'QUOTA_EXCEEDED',
    message: 'Ya tienes 3 descargas en curso (máximo 3). Espera a que termine alguna.',
    httpStatus: 429,
    retriable: true,
    ...overrides,
  } as ApiError
}

function run(error: unknown) {
  const { result } = renderHook(() => useDownloadErrorToast())
  result.current(error)
  return mockToast.mock.calls[0][0]
}

beforeEach(() => mockToast.mockReset())

describe('useDownloadErrorToast', () => {
  it('shows an English quota explanation, not the backend Spanish message', () => {
    const config = run(apiError())
    expect(config.description).toMatch(/download limit/i)
    expect(config.description).not.toContain('Ya tienes')
  })

  it('reads a quota hit as a warning, not an error (it is a limit, not a failure)', () => {
    expect(run(apiError()).variant).toBe('warning')
    expect(run(apiError()).title).toMatch(/limit reached/i)
  })

  it('reads any other API failure as an error', () => {
    const config = run(apiError({ code: 'SERVER_ERROR', httpStatus: 500 }))
    expect(config.variant).toBe('error')
    expect(config.title).toMatch(/could not start/i)
  })

  it('still says something when the failure is not an ApiError (network down)', () => {
    const config = run(new Error('Network Error'))
    expect(config.variant).toBe('error')
    expect(config.description).toBe('Please try again.')
  })

  it('shows one toast per call', () => {
    const { result } = renderHook(() => useDownloadErrorToast())
    result.current(apiError())
    expect(mockToast).toHaveBeenCalledTimes(1)
  })
})
