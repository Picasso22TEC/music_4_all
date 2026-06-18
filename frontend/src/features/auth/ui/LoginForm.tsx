'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { NeonParticles } from '@/shared/ui/NeonParticles'
import { NeonTitle } from '@/shared/ui/NeonTitle'
import { RetroDisplay } from '@/shared/ui/RetroDisplay'

// Intra-feature imports — avoid barrel to prevent circular dependency
import { useAuthStore } from '@/features/auth/model/auth.store'
import {
  useDeviceAuthPollingQuery,
  useInitDeviceAuthMutation,
} from '@/features/auth/model/auth.queries'

/**
 * Login form — v2 auth stack only.
 *
 * Flow:
 *   1. POST /session/device-auth  (useInitDeviceAuthMutation)
 *      → stores DeviceAuthCode in auth.store (setDeviceAuth)
 *   2. GET  /session/device-auth/{deviceCode}  (useDeviceAuthPollingQuery)
 *      → polling cadence from deviceAuth.interval (backend-provided, NOT hardcoded)
 *   3. On status === 'authorized' → setAuthenticated + redirect /dashboard
 *
 * Uses exclusively:
 *   - auth.store v2  (status: SessionStatus, deviceAuth: DeviceAuthCode)
 *   - /session/device-auth  (NOT /auth/device)
 *   - /session/device-auth/{deviceCode}  (NOT /auth/status)
 *   - deviceAuth.verificationUriComplete  (camelCase, NOT snake_case)
 *   - deviceAuth.userCode  (camelCase, NOT user_code)
 */
export function LoginForm() {
  const router = useRouter()
  const reducedMotion = useReducedMotion()

  // v2 auth store — status and deviceAuth (camelCase)
  const status      = useAuthStore((s) => s.status)
  const deviceAuth  = useAuthStore((s) => s.deviceAuth)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)

  const [error, setError] = useState<string | null>(null)

  // ── Redirect if already authenticated (store rehydrated from localStorage) ──

  useEffect(() => {
    // Wait for rehydration — `status` defaults to 'unauthenticated' before
    // then, so redirecting too early would just bounce straight back here.
    if (!hasHydrated) return
    if (status === 'authenticated') {
      router.replace('/dashboard')
    }
  }, [status, hasHydrated, router])

  // ── Device Auth initiation ─────────────────────────────────────────────────

  const initMutation = useInitDeviceAuthMutation()
  // onSuccess is handled inside useInitDeviceAuthMutation → setDeviceAuth(data)

  // ── Polling — interval from backend response (NOT hardcoded) ──────────────

  // DeviceAuthCode.interval is in seconds → convert to ms
  const pollingIntervalMs = deviceAuth ? deviceAuth.interval * 1000 : 5_000

  const pollingQuery = useDeviceAuthPollingQuery(
    deviceAuth?.deviceCode ?? null,
    pollingIntervalMs
  )

  // ── Handle authorized status ───────────────────────────────────────────────

  useEffect(() => {
    const data = pollingQuery.data
    if (!data) return

    if (data.status === 'authorized') {
      // Update auth.store with the authenticated user and expiry
      if (data.user && data.expiresAt) {
        useAuthStore.getState().setAuthenticated(data.user, data.expiresAt)
      }
      useAuthStore.getState().clearDeviceAuth()
      router.replace('/dashboard')
    }
  }, [pollingQuery.data, router])

  // ── Handle expired / denied (backend returns 400 DEVICE_AUTH_EXPIRED) ─────

  useEffect(() => {
    if (!pollingQuery.error) return
    useAuthStore.getState().clearDeviceAuth()
    setError('Authorization code expired or denied. Please start again.')
  }, [pollingQuery.error])

  // ── Event handlers ─────────────────────────────────────────────────────────

  function handleConnect() {
    setError(null)
    initMutation.mutate(undefined, {
      onError: () => setError('Error starting Tidal authentication. Please try again.'),
    })
  }

  function handleCancel() {
    setError(null)
    useAuthStore.getState().clearDeviceAuth()
    initMutation.reset()
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center bg-surface-void p-4"
    >
      {/* Decorative background — purely visual, behind all content (Fase 2) */}
      <NeonParticles variant="login" density="medium" />

      {/* Live region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {deviceAuth ? 'Waiting for Tidal authorization' : ''}
      </div>

      {/* ── Brand — neon sign letrero (Fase 5) ─────────────────────────────── */}
      <div className="mb-8 text-center" aria-hidden="true">
        <div className="mb-2 flex items-center justify-center gap-2">
          <span className="text-teal-500 text-xs">■</span>
          <NeonTitle color="purple" className="text-2xl font-bold tracking-widest">
            MUSIC 4 ALL
          </NeonTitle>
        </div>
        <p className="font-mono text-xs tracking-widest text-secondary">
          ∴ Lossless Audio Downloader ∴
        </p>
      </div>

      {/* ── Login card ────────────────────────────────────────────────────── */}
      <Card
        noPadding
        className="w-full max-w-md space-y-6 p-8"
        aria-labelledby="login-heading"
      >
        <h1
          id="login-heading"
          className="text-center font-mono text-heading font-semibold text-primary"
        >
          Connect to Tidal
        </h1>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className={cn(
              'rounded-md border border-semantic-error px-4 py-3',
              'bg-semantic-error/10',
            )}
          >
            <p className="font-sans text-sm text-semantic-error">{error}</p>
          </div>
        )}

        {deviceAuth ? (
          /* ── Device auth pending: verification URL + user code ─────── */
          <div className="space-y-4 text-center">
            <p className="font-sans text-sm text-secondary">
              Open this URL in your browser and authorize the app:
            </p>

            {/* verificationUriComplete — "ticket de compra" wrapper (Fase 6) */}
            <motion.div
              initial={reducedMotion ? false : { y: 20, opacity: 0 }}
              animate={reducedMotion ? false : { y: 0, opacity: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className={cn(
                'mx-auto flex max-w-xs items-start gap-2 rounded-sm p-3',
                'border-2 border-dashed border-amber-900/30 bg-amber-50/10',
              )}
            >
              <span aria-hidden="true" className="text-base leading-none">🎫</span>
              <a
                href={deviceAuth.verificationUriComplete}
                target="_blank"
                rel="noreferrer noopener"
                className={cn(
                  'block break-all font-mono text-xs text-teal-500 underline',
                  'hover:text-teal-400 transition-colors duration-100',
                  'focus-visible:outline-none focus-visible:shadow-glow-focus rounded-sm',
                )}
                aria-label="Open Tidal authorization page in a new tab"
              >
                {deviceAuth.verificationUriComplete}
              </a>
            </motion.div>

            {/* userCode — display retro estilo Nixie/VCR (Fase 6) */}
            <div className="flex items-center justify-center gap-3">
              <span className="font-sans text-xs text-secondary">Your code:</span>
              <RetroDisplay value={deviceAuth.userCode} size="lg" />
            </div>

            {/* Polling indicator — spinner sutil con Tailwind animate-spin */}
            {pollingQuery.isFetching && (
              <p
                className="flex items-center justify-center gap-2 font-sans text-sm text-secondary"
                aria-live="polite"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-block h-3 w-3 rounded-full border-2 border-secondary/30 border-t-teal-400',
                    !reducedMotion && 'animate-spin',
                  )}
                />
                Waiting for authorization…
              </p>
            )}

            {/* Cancel */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="mt-2"
            >
              Cancel and try again
            </Button>
          </div>
        ) : (
          /* ── Initial state: connect button ─────────────────────────── */
          <div className="space-y-6">
            <p className="text-center font-sans text-sm text-secondary">
              A Tidal authorization window will open in your browser.
            </p>
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleConnect}
              loading={initMutation.isPending}
              disabled={initMutation.isPending}
              className="w-full"
              aria-label="Connect with Tidal via Device Authorization"
            >
              Connect with Tidal
            </Button>
          </div>
        )}
      </Card>
    </main>
  )
}
