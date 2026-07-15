'use client'

import { cn } from '@/shared/lib/cn'
import { useAuthStore } from '@/features/auth'

import { SESSION_DOT, SESSION_LABEL } from '../model/nav'

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Estado de la sesión Tidal: puntito de conexión + "Tidal" + email.
 * Se renderiza DEBAJO del Walkman en el sidebar de escritorio y al final del
 * drawer móvil. Extraído de SidebarContent para poder reordenarlo tras el
 * reproductor (rediseño 2026-07).
 */
export function SidebarSession() {
  const status = useAuthStore((s) => s.status)
  const user   = useAuthStore((s) => s.user)

  return (
    <div className="shrink-0 border-t border-subtle px-4 py-3 space-y-1">
      {/* Punto de conexión + etiqueta ("Tidal" con el punto verde) */}
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn(
            'inline-block h-1.5 w-1.5 rounded-full',
            SESSION_DOT[status] ?? 'bg-disabled',
          )}
        />
        <span className="font-mono text-2xs font-medium text-secondary">
          {SESSION_LABEL[status] ?? 'OFFLINE'}
        </span>
      </div>

      {/* Email (cuando hay sesión). text-secondary: pasa contraste AA. */}
      {user?.email && (
        <p className="truncate pl-3.5 font-sans text-xs text-secondary">
          {user.email}
        </p>
      )}
    </div>
  )
}
