import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LoginForm } from '@/features/auth/ui/LoginForm'
import { useAuthStore } from '@/features/auth/model/auth.store'
import {
  useDeviceAuthPollingQuery,
  useInitDeviceAuthMutation,
} from '@/features/auth/model/auth.queries'
import type { DeviceAuthCode, TidalUser } from '@/entities'

// ─── Mocks ────────────────────────────────────────────────────────────────────
//
// LoginForm (real implementation, see src/features/auth/ui/LoginForm.tsx) is a
// v2 Device Authorization flow:
//   1. useInitDeviceAuthMutation()      → POST /session/device-auth
//   2. useDeviceAuthPollingQuery(code)  → GET  /session/device-auth/{code} (auto-polling,
//      cadence = deviceAuth.interval, NOT a manual "I authorized" button)
//   3. status === 'authorized'          → setAuthenticated + router.replace('/dashboard')
//
// There is no "VINCULAR CUENTA"/"YA AUTORICÉ" manual step or /api/v1/auth/* axios
// call in this codebase — those map to this component's "Connect with Tidal"
// button and automatic polling. Tests below target the real flow.

const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
}

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('@/features/auth/model/auth.queries', () => ({
  useInitDeviceAuthMutation: vi.fn(),
  useDeviceAuthPollingQuery: vi.fn(),
}))

const mockedUseInitDeviceAuthMutation = vi.mocked(useInitDeviceAuthMutation)
const mockedUseDeviceAuthPollingQuery = vi.mocked(useDeviceAuthPollingQuery)

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockDeviceAuth: DeviceAuthCode = {
  deviceCode: 'device-abc',
  userCode: 'WXYZ-1234',
  verificationUri: 'https://link.tidal.com',
  verificationUriComplete: 'https://link.tidal.com/WXYZ-1234',
  expiresIn: 300,
  interval: 5,
}

const mockUser: TidalUser = {
  id: 'user-1',
  email: 'qa@music4all.test',
  countryCode: 'US',
  plan: 'HIFI_PLUS',
}

function futureIso(ms = 3_600_000): string {
  return new Date(Date.now() + ms).toISOString()
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resetAuthStore() {
  useAuthStore.setState({
    status: 'unauthenticated',
    user: null,
    expiresAt: null,
    deviceAuth: null,
    isCheckingSession: false,
    isRecoveryModalOpen: false,
    jobIdToRetry: null,
    hasHydrated: true,
  })
  document.cookie = 'music4all_session=; max-age=0; path=/'
}

function setupMutationMock(
  overrides: Partial<ReturnType<typeof useInitDeviceAuthMutation>> = {}
) {
  mockedUseInitDeviceAuthMutation.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    reset: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useInitDeviceAuthMutation>)
}

function setupPollingMock(
  overrides: Partial<ReturnType<typeof useDeviceAuthPollingQuery>> = {}
) {
  mockedUseDeviceAuthPollingQuery.mockReturnValue({
    data: undefined,
    error: null,
    isFetching: false,
    ...overrides,
  } as unknown as ReturnType<typeof useDeviceAuthPollingQuery>)
}

beforeEach(() => {
  resetAuthStore()
  mockRouter.replace.mockClear()
  mockRouter.push.mockClear()
  setupMutationMock()
  setupPollingMock()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LoginForm', () => {
  describe('initial state', () => {
    it('renders the "Connect with Tidal" button', () => {
      render(<LoginForm />)
      expect(
        screen.getByRole('button', { name: /connect with tidal via device authorization/i })
      ).toBeVisible()
    })

    it('does not show the verification code or URL yet', () => {
      render(<LoginForm />)
      expect(screen.queryByText(/your code:/i)).not.toBeInTheDocument()
    })
  })

  describe('starting the device-auth flow', () => {
    it('calls the init mutation when the connect button is clicked', () => {
      const mutate = vi.fn()
      setupMutationMock({ mutate })
      render(<LoginForm />)

      fireEvent.click(
        screen.getByRole('button', { name: /connect with tidal via device authorization/i })
      )

      expect(mutate).toHaveBeenCalledTimes(1)
    })

    it('transitions to step 2 (code + URL) once the store receives deviceAuth', () => {
      // Simulates useInitDeviceAuthMutation's real onSuccess (auth.queries.ts),
      // which calls setDeviceAuth(data) — mocked here at the mutate() call site.
      const mutate = vi.fn(() => {
        useAuthStore.getState().setDeviceAuth(mockDeviceAuth)
      })
      setupMutationMock({ mutate })
      render(<LoginForm />)

      fireEvent.click(
        screen.getByRole('button', { name: /connect with tidal via device authorization/i })
      )

      expect(screen.getByText(mockDeviceAuth.userCode)).toBeVisible()
      expect(
        screen.getByRole('link', { name: /open tidal authorization page in a new tab/i })
      ).toHaveAttribute('href', mockDeviceAuth.verificationUriComplete)
    })

    it('shows an error message when the init mutation fails', () => {
      const mutate = vi.fn(
        (_vars: unknown, opts?: { onError?: () => void }) => opts?.onError?.()
      )
      setupMutationMock({ mutate })
      render(<LoginForm />)

      fireEvent.click(
        screen.getByRole('button', { name: /connect with tidal via device authorization/i })
      )

      expect(screen.getByRole('alert')).toHaveTextContent(
        /error starting tidal authentication/i
      )
    })
  })

  describe('step 2 — pending authorization', () => {
    beforeEach(() => {
      useAuthStore.getState().setDeviceAuth(mockDeviceAuth)
    })

    it('shows the verification URL and user code', () => {
      render(<LoginForm />)
      expect(screen.getByText(mockDeviceAuth.userCode)).toBeVisible()
      expect(screen.getByText(mockDeviceAuth.verificationUriComplete)).toBeVisible()
    })

    it('shows a polling indicator while isFetching is true', () => {
      setupPollingMock({ isFetching: true })
      render(<LoginForm />)
      expect(screen.getByText(/waiting for authorization/i)).toBeVisible()
    })

    it('clears the device code and returns to step 1 when "Cancel and try again" is clicked', () => {
      render(<LoginForm />)
      fireEvent.click(screen.getByRole('button', { name: /cancel and try again/i }))

      expect(useAuthStore.getState().deviceAuth).toBeNull()
      expect(
        screen.getByRole('button', { name: /connect with tidal via device authorization/i })
      ).toBeVisible()
    })

    it('redirects to /dashboard once polling reports status "authorized"', () => {
      setupPollingMock({
        data: { status: 'authorized', user: mockUser, expiresAt: futureIso() },
      })
      render(<LoginForm />)

      expect(useAuthStore.getState().status).toBe('authenticated')
      expect(useAuthStore.getState().deviceAuth).toBeNull()
      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard')
    })

    it('shows an error and clears deviceAuth when the polling query errors (expired code)', () => {
      setupPollingMock({ error: new Error('Device code expired') })
      render(<LoginForm />)

      expect(
        screen.getByRole('alert')
      ).toHaveTextContent(/authorization code expired or denied/i)
      expect(useAuthStore.getState().deviceAuth).toBeNull()
    })
  })

  describe('already authenticated', () => {
    it('redirects straight to /dashboard without showing the connect button', () => {
      useAuthStore.getState().setAuthenticated(mockUser, futureIso())
      render(<LoginForm />)

      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard')
    })
  })
})
