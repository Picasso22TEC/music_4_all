'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { authApi } from '../api/auth.api'
import { useAuthStore } from './auth.store'

/** Plazo por defecto hasta que el servidor dice el suyo (`session_idle_ttl`). */
const FALLBACK_IDLE_MS = 30 * 60_000
/** Antelación del aviso previo al cierre. */
const WARN_BEFORE_MS = 2 * 60_000
/** Cada cuánto, como mucho, se le dice al servidor "sigo aquí". */
const KEEPALIVE_EVERY_MS = 5 * 60_000

/** Gestos que cuentan como "el usuario sigue delante". */
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

export interface IdleTimeoutState {
  /** True cuando queda poco para cerrar la sesión: hay que avisar. */
  isWarning: boolean
  /** Segundos restantes mientras `isWarning`. */
  secondsLeft: number
  /** Cancela el cierre y renueva la ventana (botón "seguir conectado"). */
  staySignedIn: () => void
}

/**
 * Cierra la sesión tras un rato sin interacción **real** del usuario.
 *
 * Por qué hace falta: la sesión del servidor es deslizante y la app hace
 * peticiones automáticas (el historial se refresca cada 30 s), así que una
 * pestaña abierta renovaba la sesión sola y el timeout de inactividad no se
 * cumplía nunca — justo el escenario que debe cubrir: el usuario se levanta y
 * cualquiera que se siente delante sigue dentro de su cuenta.
 *
 * Reparto de responsabilidades: el navegador es el único que ve si hay alguien
 * (ratón/teclado), así que reporta esa actividad con `keepalive`; las peticiones
 * automáticas van marcadas y no renuevan nada en el servidor. Cuando se agota el
 * plazo se cierra la sesión **de verdad** (logout borra la sesión en Redis y la
 * cookie), no solo se limpia el estado del cliente.
 */
export function useIdleTimeout(enabled: boolean): IdleTimeoutState {
  const [isWarning, setIsWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)

  const idleMsRef = useRef(FALLBACK_IDLE_MS)
  const lastActivityRef = useRef(Date.now())
  const lastKeepaliveRef = useRef(0)
  const expiredRef = useRef(false)

  const expire = useCallback(async () => {
    if (expiredRef.current) return
    expiredRef.current = true
    setIsWarning(false)
    try {
      await authApi.logout()
    } catch {
      // Si el logout falla (red caída, sesión ya muerta) el cierre local manda:
      // dejar la interfaz como si siguiera dentro sería peor.
    }
    useAuthStore.getState().setExpired('idle')
  }, [])

  const markActivity = useCallback(() => {
    if (expiredRef.current) return
    lastActivityRef.current = Date.now()
    setIsWarning(false)

    // Sin esto el servidor no se enteraría de que el usuario sigue aquí: sus
    // peticiones automáticas ya no renuevan el TTL.
    const now = Date.now()
    if (now - lastKeepaliveRef.current >= KEEPALIVE_EVERY_MS) {
      lastKeepaliveRef.current = now
      void authApi
        .keepalive()
        .then(({ idleTtlSeconds }) => {
          if (idleTtlSeconds > 0) idleMsRef.current = idleTtlSeconds * 1000
        })
        .catch(() => {
          // Un keepalive fallido no debe cerrar sesión por sí solo: si de verdad
          // caducó, la siguiente petición dará 401 y el interceptor se encarga.
        })
    }
  }, [])

  const staySignedIn = useCallback(() => {
    lastKeepaliveRef.current = 0 // fuerza el keepalive: es una respuesta explícita
    markActivity()
  }, [markActivity])

  useEffect(() => {
    if (!enabled) return

    expiredRef.current = false
    lastActivityRef.current = Date.now()
    // Primer keepalive: renueva la ventana y, sobre todo, trae el plazo real.
    lastKeepaliveRef.current = 0
    markActivity()

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActivity, { passive: true })
    }

    const interval = window.setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current
      const remaining = idleMsRef.current - idleFor

      if (remaining <= 0) {
        void expire()
        return
      }
      if (remaining <= WARN_BEFORE_MS) {
        setIsWarning(true)
        setSecondsLeft(Math.ceil(remaining / 1000))
      }
    }, 1_000)

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActivity)
      }
      window.clearInterval(interval)
    }
  }, [enabled, markActivity, expire])

  return { isWarning, secondsLeft, staySignedIn }
}
