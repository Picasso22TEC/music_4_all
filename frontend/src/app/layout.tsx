import type { Metadata, Viewport } from 'next'
import { GeistMono } from 'geist/font/mono'
import { Inter, Monoton, Permanent_Marker, VT323 } from 'next/font/google'

import './globals.css'
import { Providers } from '@/providers/Providers'
import { AuthTransitionOverlay } from '@/features/auth'
import { ServiceWorkerRegistration } from './ServiceWorkerRegistration'

// ── B-04: Tipografías del Design System (design-system §2.1) ─────────────────

// Inter — UI / Interfaz → CSS var: --font-sans
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

// GeistMono — Display / Técnica → CSS var: --font-geist-mono
// globals.css mapea: --font-display: var(--font-geist-mono)
// GeistMono.variable es '--font-geist-mono' (fijo por el paquete geist)

// Monoton — Letrero neon "MUSIC 4 ALL" (display de doble trazo tipo tubo de neon
// hueco; ilumina en los bordes, no en el centro). CSS var: --font-neon
// Fuente no variable: requiere weight explicito.
const monoton = Monoton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-neon',
  display: 'swap',
})

// VT323 — Displays retro (codigo OAuth, contador de expiracion). CSS var: --font-retro
const vt323 = VT323({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-retro',
  display: 'swap',
})

// Permanent Marker — título de la canción escrito con plumón en el cassette del
// Walkman (homenaje al "Awesome Mix" de Guardianes). CSS var: --font-marker
const permanentMarker = Permanent_Marker({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-marker',
  display: 'swap',
})

// ── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Music 4 All',
  description: 'Descargador de música lossless desde Tidal',
  // No enviar Referer en peticiones de imágenes: CloudFront (CDN de Tidal)
  // devuelve 403 cuando recibe Referer: http://localhost:3000/
  referrer: 'no-referrer',
  applicationName: 'Music 4 All',
  // PWA en iOS: standalone al añadir a pantalla de inicio (iOS ignora el manifest).
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Music 4 All',
  },
}

// themeColor va en `viewport` (Next 14): pinta la barra de estado en modo standalone.
export const viewport: Viewport = {
  themeColor: '#080B0F',
}

// ── Root Layout ───────────────────────────────────────────────────────────────

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      // Aplica las variables CSS de las fuentes al elemento raíz
      // inter.variable      → --font-sans
      // GeistMono.variable  → --font-geist-mono (mapeado a --font-display en globals.css)
      // monoton.variable    → --font-neon (letrero neon)
      // vt323.variable      → --font-retro (displays retro)
      className={`${inter.variable} ${GeistMono.variable} ${monoton.variable} ${vt323.variable} ${permanentMarker.variable}`}
    >
      <body className="min-h-screen bg-surface-void font-sans text-primary antialiased">
        <Providers>
          {children}
          {/* Overlay one-shot Login → Dashboard: vive en el root (por encima de
              los grupos (auth) y (app)) para cruzar el swap de layouts. Sin
              AnimatePresence sobre children ni keys dinamicas: el shell y el
              WebSocket singleton no se tocan. */}
          <AuthTransitionOverlay />
          <ServiceWorkerRegistration />
        </Providers>
      </body>
    </html>
  )
}
