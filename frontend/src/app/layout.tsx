import type { Metadata } from 'next'
import { GeistMono } from 'geist/font/mono'
import { Inter } from 'next/font/google'

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
      // Aplica las variables CSS de ambas fuentes al elemento raíz
      // inter.variable   → --font-sans
      // GeistMono.variable → --font-geist-mono (mapeado a --font-display en globals.css)
      className={`${inter.variable} ${GeistMono.variable}`}
    >
      <body className="min-h-screen bg-surface-void font-sans text-primary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
