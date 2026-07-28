'use client'

import { useEffect } from 'react'

/**
 * Registra el service worker (PWA P1) — solo en producción.
 *
 * En desarrollo NO se registra: un SW cacheando el dev server de Next causa el
 * clásico "me sirve código viejo" (ver docs/troubleshooting y el HMR en Docker).
 * Se registra tras `load` para no competir con el arranque de la app.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Best-effort: si el registro falla, la app funciona igual (sin PWA).
      })
    }
    window.addEventListener('load', register)
    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
