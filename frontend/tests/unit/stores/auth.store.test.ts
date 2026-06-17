import { beforeEach, describe, expect, it } from 'vitest'

import { useAuthStore } from '@/features/auth/model/auth.store'
import type { TidalUser } from '@/entities'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUser: TidalUser = {
  id: 'user-123',
  email: 'qa@music4all.test',
  countryCode: 'US',
  plan: 'HIFI_PLUS',
}

function futureIso(ms = 3_600_000): string {
  return new Date(Date.now() + ms).toISOString()
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resetAuthStore() {
  // Merge-reset data fields only — actions remain intact; hasHydrated is not reset
  // because onRehydrateStorage sets it once on module initialization.
  useAuthStore.setState({
    status: 'unauthenticated',
    user: null,
    expiresAt: null,
    deviceAuth: null,
    isCheckingSession: false,
    isRecoveryModalOpen: false,
    jobIdToRetry: null,
  })
  // Clear cookie side effects
  document.cookie = 'music4all_session=; max-age=0; path=/'
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('auth.store', () => {
  beforeEach(resetAuthStore)

  describe('initial / reset state', () => {
    it('status is unauthenticated after reset', () => {
      expect(useAuthStore.getState().status).toBe('unauthenticated')
    })

    it('user and expiresAt are null after reset', () => {
      const { user, expiresAt } = useAuthStore.getState()
      expect(user).toBeNull()
      expect(expiresAt).toBeNull()
    })

    it('hasHydrated becomes true after explicit rehydration', async () => {
      // In jsdom localStorage is empty, so we trigger rehydration manually.
      // This tests our onRehydrateStorage callback, not Zustand internals.
      await useAuthStore.persist.rehydrate()
      expect(useAuthStore.getState().hasHydrated).toBe(true)
    })
  })

  describe('setAuthenticated', () => {
    it('sets status to authenticated', () => {
      useAuthStore.getState().setAuthenticated(mockUser, futureIso())
      expect(useAuthStore.getState().status).toBe('authenticated')
    })

    it('stores the user object', () => {
      useAuthStore.getState().setAuthenticated(mockUser, futureIso())
      expect(useAuthStore.getState().user).toEqual(mockUser)
    })

    it('stores the expiresAt timestamp', () => {
      const iso = futureIso()
      useAuthStore.getState().setAuthenticated(mockUser, iso)
      expect(useAuthStore.getState().expiresAt).toBe(iso)
    })

    it('writes the music4all_session cookie', () => {
      useAuthStore.getState().setAuthenticated(mockUser, futureIso())
      expect(document.cookie).toContain('music4all_session=1')
    })
  })

  describe('setExpired', () => {
    it('changes status to expired', () => {
      useAuthStore.getState().setAuthenticated(mockUser, futureIso())
      useAuthStore.getState().setExpired()
      expect(useAuthStore.getState().status).toBe('expired')
    })

    it('clears the session cookie', () => {
      useAuthStore.getState().setAuthenticated(mockUser, futureIso())
      useAuthStore.getState().setExpired()
      expect(document.cookie).not.toContain('music4all_session=1')
    })
  })

  describe('clearSession', () => {
    it('resets status to unauthenticated', () => {
      useAuthStore.getState().setAuthenticated(mockUser, futureIso())
      useAuthStore.getState().clearSession()
      expect(useAuthStore.getState().status).toBe('unauthenticated')
    })

    it('clears user and expiresAt', () => {
      useAuthStore.getState().setAuthenticated(mockUser, futureIso())
      useAuthStore.getState().clearSession()

      const { user, expiresAt } = useAuthStore.getState()
      expect(user).toBeNull()
      expect(expiresAt).toBeNull()
    })

    it('clears the session cookie', () => {
      useAuthStore.getState().setAuthenticated(mockUser, futureIso())
      useAuthStore.getState().clearSession()
      expect(document.cookie).not.toContain('music4all_session=1')
    })
  })

  describe('recovery modal', () => {
    it('openRecoveryModal sets isRecoveryModalOpen to true', () => {
      useAuthStore.getState().openRecoveryModal()
      expect(useAuthStore.getState().isRecoveryModalOpen).toBe(true)
    })

    it('openRecoveryModal stores the jobIdToRetry when provided', () => {
      useAuthStore.getState().openRecoveryModal('job-abc')
      expect(useAuthStore.getState().jobIdToRetry).toBe('job-abc')
    })

    it('closeRecoveryModal sets isRecoveryModalOpen to false', () => {
      useAuthStore.getState().openRecoveryModal()
      useAuthStore.getState().closeRecoveryModal()
      expect(useAuthStore.getState().isRecoveryModalOpen).toBe(false)
    })
  })
})
