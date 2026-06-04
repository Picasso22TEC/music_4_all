export const WS_ENDPOINT = '/ws/downloads'

export function buildWsUrl(): string {
  if (typeof window === 'undefined') return `ws://localhost:8000${WS_ENDPOINT}`
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}${WS_ENDPOINT}`
}
