'use client'

import { useCallback, useEffect, useState } from 'react'

import { pushApi } from '../api/push.api'
import { urlBase64ToUint8Array } from '../lib/vapid'

function browserSupportsPush(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

interface PushState {
  /** El navegador soporta notificaciones push. */
  supported: boolean
  /** El servidor tiene el push activo (claves VAPID configuradas). */
  backendEnabled: boolean
  /** Hay un service worker activo (en dev no se registra → false). */
  swReady: boolean
  /** El usuario ya está suscrito en este navegador. */
  subscribed: boolean
  permission: NotificationPermission | 'unsupported'
  busy: boolean
  error: string | null
}

/**
 * Gestiona las notificaciones "descarga lista" (Web Push) en el navegador actual.
 *
 * Pensado para montarse en Ajustes (ruta autenticada), así que consulta el estado
 * del servidor al montar sin riesgo de 401. En desarrollo el service worker no se
 * registra, así que `swReady` será false y la UI invita a instalar la app.
 */
export function usePushNotifications() {
  const supported = browserSupportsPush()
  const [state, setState] = useState<PushState>({
    supported,
    backendEnabled: false,
    swReady: false,
    subscribed: false,
    permission: supported ? Notification.permission : 'unsupported',
    busy: true,
    error: null,
  })
  const [publicKey, setPublicKey] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!supported) {
      setState((s) => ({ ...s, busy: false }))
      return
    }
    ;(async () => {
      try {
        const status = await pushApi.getStatus()
        const reg = await navigator.serviceWorker.getRegistration()
        const sub = reg ? await reg.pushManager.getSubscription() : null
        if (cancelled) return
        setPublicKey(status.publicKey)
        setState((s) => ({
          ...s,
          backendEnabled: status.enabled,
          swReady: !!reg,
          subscribed: !!sub,
          busy: false,
        }))
      } catch {
        if (!cancelled) setState((s) => ({ ...s, busy: false }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supported])

  const enable = useCallback(async () => {
    if (!supported || !publicKey) return
    setState((s) => ({ ...s, busy: true, error: null }))
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState((s) => ({ ...s, permission, busy: false, error: 'Permission denied.' }))
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast: TS 5.7 tipa Uint8Array como Uint8Array<ArrayBufferLike>, que no
        // encaja directo en BufferSource aunque en runtime es válido.
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      })
      await pushApi.subscribe(sub.toJSON())
      setState((s) => ({ ...s, permission, subscribed: true, swReady: true, busy: false }))
    } catch {
      setState((s) => ({ ...s, busy: false, error: 'Could not enable notifications.' }))
    }
  }, [supported, publicKey])

  const disable = useCallback(async () => {
    if (!supported) return
    setState((s) => ({ ...s, busy: true, error: null }))
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = reg ? await reg.pushManager.getSubscription() : null
      if (sub) {
        await pushApi.unsubscribe(sub.endpoint)
        await sub.unsubscribe()
      }
      setState((s) => ({ ...s, subscribed: false, busy: false }))
    } catch {
      setState((s) => ({ ...s, busy: false, error: 'Could not disable notifications.' }))
    }
  }, [supported])

  return { ...state, enable, disable }
}
