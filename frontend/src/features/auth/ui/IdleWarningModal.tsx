'use client'

import { useEffect, useRef } from 'react'

import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui'
import { useAuthStore } from '../model/auth.store'
import { useIdleTimeout } from '../model/useIdleTimeout'

/**
 * Aviso previo al cierre de sesión por inactividad.
 *
 * Se monta en el shell autenticado, así que el vigilante corre en toda la app y
 * no se reinicia al navegar. Solo pinta algo en los últimos minutos.
 */
export function IdleWarningModal() {
  const isAuthenticated = useAuthStore((s) => s.status === 'authenticated')
  const { isWarning, secondsLeft, staySignedIn } = useIdleTimeout(isAuthenticated)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isWarning) buttonRef.current?.focus()
  }, [isWarning])

  if (!isWarning) return null

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const countdown = minutes > 0 ? `${minutes} min ${seconds}s` : `${seconds}s`

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-warning-title"
      aria-describedby="idle-warning-description"
    >
      <div
        className={cn(
          'flex w-full max-w-sm flex-col gap-4 rounded-lg p-6',
          'border border-subtle bg-surface-rack shadow-xl',
        )}
      >
        <h2 id="idle-warning-title" className="font-sans text-lg font-bold text-primary">
          Still there?
        </h2>
        <p id="idle-warning-description" className="font-sans text-sm text-secondary">
          Your session will close in{' '}
          {/* aria-live: el tiempo cambia cada segundo y un lector de pantalla debe
              enterarse sin que el foco salte */}
          <span className="font-mono text-primary" aria-live="polite">
            {countdown}
          </span>{' '}
          because of inactivity. Anyone using this device would otherwise stay signed in to your
          Tidal account.
        </p>
        <Button ref={buttonRef} type="button" variant="primary" size="sm" onClick={staySignedIn}>
          Stay signed in
        </Button>
      </div>
    </div>
  )
}
