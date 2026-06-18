export const WS_ENDPOINT = '/ws/downloads'

export function buildWsUrl(): string {
  // Override explícito (desarrollo): conectar directo al backend. El dev-server
  // de Next.js 14.2 crashea al manejar el upgrade WS de un rewrite hacia una URL
  // absoluta ("Cannot read properties of undefined (reading 'bind')"), por lo que
  // en dev se apunta a ws://localhost:8000 saltándose el proxy de Next.
  const origin = process.env.NEXT_PUBLIC_WS_URL
  if (origin) return `${origin}${WS_ENDPOINT}`

  // Producción: mismo origen — nginx hace proxy de /ws/ al backend (music4all.conf).
  if (typeof window === 'undefined') return `ws://localhost:8000${WS_ENDPOINT}`
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}${WS_ENDPOINT}`
}
