export {
  useAuthStore,
  selectIsAuthenticated,
  selectUser,
  selectIsRecoveryModalOpen,
  selectDeviceAuth,
  selectJobIdToRetry,
} from './model/auth.store'
// Also imported locally for openSessionRecovery() implementation
import { useAuthStore } from './model/auth.store'
export {
  useSessionStatusQuery,
  useInitDeviceAuthMutation,
  useDeviceAuthPollingQuery,
  useLogoutMutation,
} from './model/auth.queries'
export {
  usePkceStatusQuery,
  useHiFiConnected,
  useLockedDownloadQualities,
  usePkceStartMutation,
  usePkceCompleteMutation,
  usePkceDisconnectMutation,
  HIFI_LOCKED_HINT,
} from './model/pkce.queries'
export { authApi } from './api/auth.api'
export {
  LoginForm,
  SessionRecoveryModal,
  AuthTransitionOverlay,
  IdleWarningModal,
  HiFiConnection,
} from './ui'
export { playAuthTransition } from './model/auth-transition.store'

// ── Public API for triggering recovery from DownloadPanel (Fase 6E/6F) ───────
// Widgets can call this without importing from features/auth internals.

/**
 * Opens the Session Recovery Modal.
 * Called from DownloadPanel when a download fails with 401 / 403 / AUTH_REQUIRED.
 *
 * @param jobIdToRetry - Backend job ID to retry after successful recovery.
 */
export function openSessionRecovery(jobIdToRetry?: string): void {
  useAuthStore.getState().openRecoveryModal(jobIdToRetry)
}
