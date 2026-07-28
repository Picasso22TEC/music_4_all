import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SessionsPanel } from '@/features/auth/ui/SessionsPanel'
import {
  useRevokeOtherSessionsMutation,
  useRevokeSessionMutation,
  useSessionsQuery,
} from '@/features/auth/model/sessions.queries'
import type { ActiveSession } from '@/entities'

vi.mock('@/features/auth/model/sessions.queries', () => ({
  useSessionsQuery: vi.fn(),
  useRevokeSessionMutation: vi.fn(),
  useRevokeOtherSessionsMutation: vi.fn(),
}))

const mockedUseSessions = vi.mocked(useSessionsQuery)
const mockedRevokeOne = vi.mocked(useRevokeSessionMutation)
const mockedRevokeOthers = vi.mocked(useRevokeOtherSessionsMutation)

const now = Date.now() / 1000
const CURRENT: ActiveSession = {
  sid: 'sid-current',
  createdAt: now - 100,
  lastSeen: now - 5,
  ip: '10.0.0.1',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120',
  current: true,
}
const OTHER: ActiveSession = {
  sid: 'sid-other',
  createdAt: now - 5000,
  lastSeen: now - 4000,
  ip: '10.0.0.2',
  userAgent: 'Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile',
  current: false,
}

const revokeOneMutate = vi.fn()
const revokeOthersMutate = vi.fn()

function setSessions(sessions: ActiveSession[]) {
  mockedUseSessions.mockReturnValue({
    data: sessions,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useSessionsQuery>)
}

beforeEach(() => {
  revokeOneMutate.mockClear()
  revokeOthersMutate.mockClear()
  mockedRevokeOne.mockReturnValue({
    mutate: revokeOneMutate,
    isPending: false,
    variables: undefined,
  } as unknown as ReturnType<typeof useRevokeSessionMutation>)
  mockedRevokeOthers.mockReturnValue({
    mutate: revokeOthersMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useRevokeOtherSessionsMutation>)
  setSessions([CURRENT, OTHER])
})

describe('SessionsPanel', () => {
  it('marks the current session as "This device"', () => {
    render(<SessionsPanel />)
    expect(screen.getByText(/this device/i)).toBeVisible()
  })

  it('revokes another device by its sid when its "Sign out" is clicked', () => {
    render(<SessionsPanel />)
    fireEvent.click(screen.getByRole('button', { name: /sign out .*android/i }))
    expect(revokeOneMutate).toHaveBeenCalledWith('sid-other')
  })

  it('shows "Sign out other devices" only when other sessions exist and triggers it', () => {
    render(<SessionsPanel />)
    fireEvent.click(screen.getByRole('button', { name: /sign out all other devices/i }))
    expect(revokeOthersMutate).toHaveBeenCalledTimes(1)
  })

  it('hides "Sign out other devices" when the only session is the current one', () => {
    setSessions([CURRENT])
    render(<SessionsPanel />)
    expect(
      screen.queryByRole('button', { name: /sign out all other devices/i })
    ).not.toBeInTheDocument()
  })
})
