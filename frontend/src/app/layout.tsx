import type { Metadata } from 'next'
import { GeistMono } from 'geist/font/mono'
import { Inter, Press_Start_2P, VT323 } from 'next/font/google'

import './globals.css'
import { Providers } from '@/providers/Providers'

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

// Press Start 2P — Letrero neon "MUSIC 4 ALL" (uso restringido, design-system §3.2)
// Fuente no variable: requiere weight explícito. CSS var: --font-pixel
const pressStart2P = Press_Start_2P({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-pixel',
  display: 'swap',
})

// VT323 — Displays retro (codigo OAuth, contador de expiracion). CSS var: --font-retro
const vt323 = VT323({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-retro',
  display: 'swap',
})

// ── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Music 4 All',
  description: 'Descargador de música lossless desde Tidal',
  // No enviar Referer en peticiones de imágenes: CloudFront (CDN de Tidal)
  // devuelve 403 cuando recibe Referer: http://localhost:3000/
  referrer: 'no-referrer',
}

// ── Root Layout ───────────────────────────────────────────────────────────────

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      // Aplica las variables CSS de las fuentes al elemento raíz
      // inter.variable      → --font-sans
      // GeistMono.variable  → --font-geist-mono (mapeado a --font-display en globals.css)
      // pressStart2P.variable → --font-pixel (letrero neon)
      // vt323.variable      → --font-retro (displays retro)
      className={`${inter.variable} ${GeistMono.variable} ${pressStart2P.variable} ${vt323.variable}`}
    >
      <body className="min-h-screen bg-surface-void font-sans text-primary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
