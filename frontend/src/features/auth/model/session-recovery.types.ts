/**
 * State machine for the Session Recovery Modal (wireframes §14 — Estado G-recovery).
 *
 * Phases:
 *   checking    → Running GET /session/status
 *   expired     → Session invalid, needs re-authentication
 *   device_auth → POST /session/device-auth in progress
 *   waiting     → Polling GET /session/device-auth/{deviceCode}
 *   success     → Session active or successfully renewed
 *   error       → Unrecoverable error (show retry/cancel)
 */

export type RecoveryPhase =
  | 'checking'     // G-recovery Fase 1
  | 'expired'      // G-recovery Fase 2b (entry point for re-auth)
  | 'device_auth'  // POST /session/device-auth firing
  | 'waiting'      // Polling — user authorizing on Tidal website
  | 'success'      // G-recovery Fase 2a (active) or Fase 3 (renewed)
  | 'error'        // Any terminal error

/** Disambiguates the two success variants */
export type SuccessVariant =
  | 'session_active'   // Session was already valid — no re-auth needed
  | 'session_renewed'  // Session was re-authorized by the user

/** Valid transitions for each phase — used for documentation + testing */
export const RECOVERY_TRANSITIONS: Readonly<Record<RecoveryPhase, ReadonlyArray<RecoveryPhase>>> = {
  checking:    ['expired', 'success', 'error'],
  expired:     ['device_auth', 'error'],
  device_auth: ['waiting', 'error'],
  waiting:     ['success', 'error'],
  success:     [],                  // terminal — auto-closes after 2s
  error:       ['checking'],        // Retry re-enters checking
} as const
