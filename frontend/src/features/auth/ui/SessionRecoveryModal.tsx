'use client'

import { useCallback, useEffect, useState } from 'react'

import { Modal } from '@/shared/ui/Modal'

// Intra-feature imports — avoids barrel to prevent circular dependency
import { useAuthStore } from '../model/auth.store'
import { useDeviceAuthPollingQuery, useInitDeviceAuthMutation, useSessionStatusQuery } from '../model/auth.queries'
import type { RecoveryPhase, SuccessVariant } from '../model/session-recovery.types'

import { SessionRecoveryActions } from './SessionRecoveryActions'
import { SessionRecoveryContent } from './SessionRecoveryContent'

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Session Recovery Modal (wireframes §14 — Estado G-recovery).
 *
 * State machine phases:
 *   checking → expired → device_auth → waiting → success (renewed)
 *   checking → success (session_active)
 *   any      → error
 *
 * Trigger via: openSessionRecovery() exported from features/auth
 * Reads:       useAuthStore.isRecoveryModalOpen
 * Mounts in:   app/(app)/layout.tsx (always present for authenticated users)
 */
export function SessionRecoveryModal() {
  const isOpen      = useAuthStore((s) => s.isRecoveryModalOpen)
  const user        = useAuthStore((s) => s.user)
  const deviceAuth  = useAuthStore((s) => s.deviceAuth)
  const jobIdToRetry = useAuthStore((s) => s.jobIdToRetry)

  // ── Local state machine ──────────────────────────────────────────────────
  const [phase,          setPhase]          = useState<RecoveryPhase>('checking')
  const [successVariant, setSuccessVariant] = useState<SuccessVariant | undefined>()
  const [error,          setError]          = useState<string | null>(null)
  const [expiresAt,      setExpiresAt]      = useState<string | null>(null)
  const [countdown,      setCountdown]      = useState<number | null>(null)

  // ── Auth queries ─────────────────────────────────────────────────────────
  const sessionQuery = useSessionStatusQuery()           // manual — activated by refetch()
  const initMutation = useInitDeviceAuthMutation()        // POST /session/device-auth

  const pollingInterval = deviceAuth ? deviceAuth.interval * 1_000 : 5_000
  const pollingQuery = useDeviceAuthPollingQuery(
    // Enable polling only while waiting for authorization
    phase === 'waiting' ? (deviceAuth?.deviceCode ?? null) : null,
    pollingInterval,
  )

  // ── Reset + trigger check when modal opens ───────────────────────────────
  const refetchSession = sessionQuery.refetch
  useEffect(() => {
    if (!isOpen) return
    setPhase('checking')
    setError(null)
    setSuccessVariant(undefined)
    setExpiresAt(null)
    refetchSession().catch(() => {
      setPhase('error')
      setError('Failed to check session status.')
    })
  }, [isOpen, refetchSession])

  // ── Handle session status result ─────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'checking' || !sessionQuery.data) return
    const { status, expiresAt: at } = sessionQuery.data
    if (status === 'active') {
      setExpiresAt(at ?? null)
      setSuccessVariant('session_active')
      setPhase('success')
    } else {
      setPhase('expired')
    }
  }, [phase, sessionQuery.data])

  // Handle session check error
  useEffect(() => {
    if (phase !== 'checking' || !sessionQuery.isError) return
    setPhase('error')
    setError('Unable to verify session status. Please try again.')
  }, [phase, sessionQuery.isError])

  // ── Handle device auth polling result ────────────────────────────────────
  useEffect(() => {
    if (!pollingQuery.data) return
    const data = pollingQuery.data
    if (data.status === 'authorized') {
      if (data.user && data.expiresAt) {
        useAuthStore.getState().setAuthenticated(data.user, data.expiresAt)
        setExpiresAt(data.expiresAt)
      }
      useAuthStore.getState().clearDeviceAuth()
      setSuccessVariant('session_renewed')
      setPhase('success')
    }
    // expired/denied → polling error handler catches them as ApiError (400)
  }, [pollingQuery.data])

  // Handle polling error (DEVICE_AUTH_EXPIRED → ApiError 400)
  useEffect(() => {
    if (!pollingQuery.error || phase !== 'waiting') return
    useAuthStore.getState().clearDeviceAuth()
    setPhase('error')
    setError('Authorization code expired or was denied. Please try again.')
  }, [pollingQuery.error, phase])

  // ── Countdown timer for device auth code ─────────────────────────────────
  useEffect(() => {
    if (phase !== 'waiting' || !deviceAuth) {
      setCountdown(null)
      return
    }
    setCountdown(deviceAuth.expiresIn)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1_000)
    return () => clearInterval(timer)
  }, [phase, deviceAuth]) // restart when phase changes or a new device code is issued

  // ── Auto-close after success ─────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'success') return
    const timer = setTimeout(() => useAuthStore.getState().closeRecoveryModal(), 2_000)
    return () => clearTimeout(timer)
  }, [phase])

  // ── Action handlers ──────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    useAuthStore.getState().closeRecoveryModal()
  }, [])

  const handleReconnect = useCallback(() => {
    setError(null)
    setPhase('device_auth')
    initMutation.mutate(undefined, {
      onSuccess: () => setPhase('waiting'),
      onError:   () => { setPhase('error'); setError('Failed to start authentication. Please try again.') },
    })
  }, [initMutation])

  const handleRetryCheck = useCallback(() => {
    setPhase('checking')
    setError(null)
    refetchSession().catch(() => {
      setPhase('error')
      setError('Failed to check session status.')
    })
  }, [refetchSession])

  const handleOpenTidal = useCallback(() => {
    if (deviceAuth?.verificationUriComplete) {
      window.open(deviceAuth.verificationUriComplete, '_blank', 'noopener,noreferrer')
    }
  }, [deviceAuth?.verificationUriComplete])

  const handleCopyCode = useCallback(() => {
    if (!deviceAuth?.userCode) return
    navigator.clipboard?.writeText(deviceAuth.userCode).catch(() => {
      // Clipboard API unavailable — fail silently
    })
  }, [deviceAuth?.userCode])

  /**
   * Closes the modal with jobIdToRetry preserved in the store.
   * DownloadPanel (Phase 6E integration) watches for auth recovery + jobIdToRetry
   * to trigger the PATCH /downloads/{id} { action: 'retry' } automatically.
   */
  const handleRetryJob = useCallback(() => {
    useAuthStore.getState().closeRecoveryModal()
    // jobIdToRetry is intentionally kept in store until cleared on next openRecoveryModal
  }, [])

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Tidal Session"
      size="sm"
    >
      <SessionRecoveryContent
        phase={phase}
        successVariant={successVariant}
        deviceAuth={deviceAuth}
        userEmail={user?.email}
        expiresAt={expiresAt}
        error={error}
        countdown={countdown}
      />
      <SessionRecoveryActions
        phase={phase}
        successVariant={successVariant}
        jobIdToRetry={jobIdToRetry}
        onClose={handleClose}
        onReconnect={handleReconnect}
        onRetryCheck={handleRetryCheck}
        onOpenTidal={handleOpenTidal}
        onCopyCode={handleCopyCode}
        onRetryJob={handleRetryJob}
      />
    </Modal>
  )
}
