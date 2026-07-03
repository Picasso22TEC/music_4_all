import { Button } from '@/shared/ui/Button'

import type { RecoveryPhase, SuccessVariant } from '../model/session-recovery.types'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SessionRecoveryActionsProps {
  phase: RecoveryPhase
  successVariant?: SuccessVariant
  /** Backend job ID — shows "Retry Download" button when present */
  jobIdToRetry: string | null
  onClose: () => void
  /** Starts re-authentication flow */
  onReconnect: () => void
  /** Retries the session check (from error state) */
  onRetryCheck: () => void
  /** Opens verificationUriComplete in a new tab */
  onOpenTidal: () => void
  /** Copies userCode to clipboard */
  onCopyCode: () => void
  /** Closes modal after storing jobIdToRetry — integration handled by DownloadPanel */
  onRetryJob: () => void
}

// ─── Component (purely presentational) ───────────────────────────────────────

/**
 * Phase-specific action buttons for the Session Recovery Modal.
 * Purely presentational — all handlers passed via props.
 */
export function SessionRecoveryActions({
  phase,
  successVariant,
  jobIdToRetry,
  onClose,
  onReconnect,
  onRetryCheck,
  onOpenTidal,
  onCopyCode,
  onRetryJob,
}: SessionRecoveryActionsProps) {
  return (
    <div className="flex flex-col gap-2 pt-2">
      {/* ── CHECKING — no actions while validating ──────────────────── */}
      {phase === 'checking' && null}

      {/* ── EXPIRED — offer reconnect or cancel ─────────────────────── */}
      {phase === 'expired' && (
        <>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onReconnect}
            className="w-full"
            aria-label="Reconnect with TIDAL via Device Authorization"
          >
            Reconnect with TIDAL
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            className="w-full"
          >
            Cancel
          </Button>
        </>
      )}

      {/* ── DEVICE_AUTH — loading, only cancel ──────────────────────── */}
      {phase === 'device_auth' && (
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={onClose}
          className="w-full"
        >
          Cancel
        </Button>
      )}

      {/* ── WAITING — open Tidal, copy code, cancel ─────────────────── */}
      {phase === 'waiting' && (
        <>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onOpenTidal}
            className="w-full"
            aria-label="Open TIDAL authorization page in a new browser tab"
          >
            Open TIDAL Login
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onCopyCode}
            className="w-full"
            aria-label="Copy authorization code to clipboard"
          >
            Copy Code
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            className="w-full"
          >
            Cancel
          </Button>
        </>
      )}

      {/* ── SUCCESS — retry download (if applicable) or close ───────── */}
      {phase === 'success' && (
        <>
          {jobIdToRetry && (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={onRetryJob}
              className="w-full"
              aria-label="Retry the failed download"
            >
              Retry Download
            </Button>
          )}
          <Button
            type="button"
            variant={jobIdToRetry ? 'ghost' : 'secondary'}
            size="md"
            onClick={onClose}
            className="w-full"
          >
            {successVariant === 'session_active' ? 'Close' : 'Close'}
          </Button>
        </>
      )}

      {/* ── ERROR — retry check or cancel ────────────────────────────── */}
      {phase === 'error' && (
        <>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onRetryCheck}
            className="w-full"
            aria-label="Retry session check"
          >
            Try Again
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            className="w-full"
          >
            Cancel
          </Button>
        </>
      )}
    </div>
  )
}
