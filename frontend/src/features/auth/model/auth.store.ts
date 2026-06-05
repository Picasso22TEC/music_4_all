import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { DeviceAuthCode, TidalUser } from '@/entities'

type SessionStatus = 'authenticated' | 'expired' | 'unauthenticated'

interface AuthState {
  status: SessionStatus
  user: TidalUser | null
  expiresAt: string | null          // ISO 8601
  deviceAuth: DeviceAuthCode | null
  isCheckingSession: boolean
  isRecoveryModalOpen: boolean
  /** Backend job ID to retry once the session is recovered (Phase 6E/6F) */
  jobIdToRetry: string | null
}

interface AuthActions {
  setAuthenticated: (user: TidalUser, expiresAt: string) => void
  setExpired: () => void
  clearSession: () => void
  setDeviceAuth: (code: DeviceAuthCode) => void
  clearDeviceAuth: () => void
  setCheckingSession: (v: boolean) => void
  /** Opens the recovery modal, optionally storing the job to retry after auth */
  openRecoveryModal: (jobIdToRetry?: string) => void
  closeRecoveryModal: () => void
  /**
   * Clears jobIdToRetry after the retry has been dispatched.
   * Called by useDownloadRecovery (Phase 6H) after a successful retry mutation.
   */
  clearJobIdToRetry: () => void
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      status: 'unauthenticated',
      user: null,
      expiresAt: null,
      deviceAuth: null,
      isCheckingSession: false,
      isRecoveryModalOpen: false,
      jobIdToRetry: null,

      setAuthenticated: (user, expiresAt) =>
        set({ status: 'authenticated', user, expiresAt }),

      setExpired: () => set({ status: 'expired' }),

      clearSession: () =>
        set({
          status: 'unauthenticated',
          user: null,
          expiresAt: null,
          deviceAuth: null,
        }),

      setDeviceAuth: (deviceAuth) => set({ deviceAuth }),
      clearDeviceAuth: () => set({ deviceAuth: null }),
      setCheckingSession: (isCheckingSession) => set({ isCheckingSession }),
      openRecoveryModal: (jobIdToRetry) =>
        set({ isRecoveryModalOpen: true, jobIdToRetry: jobIdToRetry ?? null }),
      closeRecoveryModal: () =>
        // jobIdToRetry intentionally preserved — consumed by useDownloadRecovery
        // (Phase 6H) which dispatches the retry then calls clearJobIdToRetry().
        set({ isRecoveryModalOpen: false, deviceAuth: null, isCheckingSession: false }),
      clearJobIdToRetry: () => set({ jobIdToRetry: null }),
    }),
    {
      name: 'music4all-auth',
      storage: createJSONStorage(() => localStorage),
      // accessToken is NOT persisted — managed by backend via httpOnly cookie (RM-03)
      partialize: (s) => ({
        status: s.status,
        user: s.user,
        expiresAt: s.expiresAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // Mark as expired on rehydration if token has elapsed
        if (state.expiresAt && new Date(state.expiresAt) < new Date()) {
          state.status = 'expired'
        }
      },
    }
  )
)

// Selectors
export const selectIsAuthenticated = (s: AuthState) => s.status === 'authenticated'
export const selectUser = (s: AuthState) => s.user
export const selectIsRecoveryModalOpen = (s: AuthState) => s.isRecoveryModalOpen
export const selectDeviceAuth = (s: AuthState) => s.deviceAuth
export const selectJobIdToRetry = (s: AuthState) => s.jobIdToRetry
