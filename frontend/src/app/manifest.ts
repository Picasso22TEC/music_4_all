import type { MetadataRoute } from 'next'

/**
 * Web App Manifest (PWA P1). Next.js sirve esto en `/manifest.webmanifest` y añade
 * automáticamente el `<link rel="manifest">` al `<head>`.
 *
 * `start_url` es `/dashboard`: al abrir la app instalada se va a la pantalla
 * principal; si no hay sesión, el middleware redirige a `/login` (comportamiento
 * correcto). Los iconos son SVG (escalan a cualquier tamaño) — un set PNG
 * 192/512 es un pulido posterior para iOS, que ignora los iconos del manifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Music 4 All',
    short_name: 'Music 4 All',
    description: 'Lossless music downloader for your Tidal account',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#080B0F',
    theme_color: '#080B0F',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icons/maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}
