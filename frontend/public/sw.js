/*
 * Music 4 All — service worker (PWA P1).
 *
 * Caché conservador para una app autenticada: NUNCA toca /api ni el WebSocket, las
 * navegaciones van network-first (nada de HTML autenticado obsoleto) con offline.html
 * de reserva, y solo los estáticos con hash se sirven cache-first. Incluye los
 * handlers de Web Push (inertes hasta que existan suscripciones — PWA P1-C).
 *
 * Sube VERSION para invalidar la caché en un despliegue.
 */
const VERSION = 'v1'
const STATIC_CACHE = `m4a-static-${VERSION}`
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:css|js|woff2?|svg|png|jpe?g|webp|ico)$/.test(url.pathname)
  )
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Solo mismo origen; nunca la API ni el WebSocket (deben ir siempre a la red).
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws')) return

  // Navegaciones: network-first con offline.html de reserva.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  // Estáticos con hash (inmutables): cache-first + revalidación en segundo plano.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        const network = fetch(request)
          .then((resp) => {
            if (resp && resp.status === 200) cache.put(request, resp.clone())
            return resp
          })
          .catch(() => cached)
        return cached || network
      })
    )
  }
})

// ── Web Push (PWA P1-C) ──────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = {}
  }
  const title = data.title || 'Music 4 All'
  const options = {
    body: data.body || '',
    icon: '/icons/maskable.svg',
    badge: '/icons/maskable.svg',
    tag: data.tag,
    data: { url: data.url || '/downloads' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/downloads'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(target)
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    })
  )
})
