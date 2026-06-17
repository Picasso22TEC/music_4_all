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
  /**
   * True once the persisted state has been read from localStorage.
   * `status` defaults to 'unauthenticated' until then — pages must wait
   * for this flag before redirecting based on `status`, otherwise an
   * already-authenticated user gets bounced through /login and back.
   */
  hasHydrated: boolean
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

// ── Cookie helpers — kept thin; cookie is non-httpOnly by design (RM-03 tracks future upgrade) ──

function setSessionCookie(expiresAt: string): void {
  if (typeof window === 'undefined') return
  const maxAge = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
  if (maxAge > 0) {
    document.cookie = `music4all_session=1; path=/; max-age=${maxAge}; SameSite=Lax`
  }
}

function clearSessionCookie(): void {
  if (typeof window === 'undefined') return
  document.cookie = 'music4all_session=; path=/; max-age=0; SameSite=Lax'
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
      hasHydrated: false,

      setAuthenticated: (user, expiresAt) => {
        setSessionCookie(expiresAt)
        set({ status: 'authenticated', user, expiresAt })
      },

      setExpired: () => {
        clearSessionCookie()
        set({ status: 'expired' })
      },

      clearSession: () => {
        clearSessionCookie()
        set({
          status: 'unauthenticated',
          user: null,
          expiresAt: null,
          deviceAuth: null,
        })
      },

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
        // Mark as expired on rehydration if token has elapsed
        if (state?.expiresAt && new Date(state.expiresAt) < new Date()) {
          state.status = 'expired'
        }
        // Sync session cookie so middleware sees the auth state on next navigation
        if (state?.status === 'authenticated' && state.expiresAt) {
          setSessionCookie(state.expiresAt)
        } else {
          clearSessionCookie()
        }
        useAuthStore.setState({ hasHydrated: true })
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
