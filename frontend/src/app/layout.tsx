import type { Metadata } from 'next'
import './globals.css'
import { QueryProvider } from '@/providers/QueryProvider'

export const metadata: Metadata = {
  title: 'Music 4 All',
  description: 'Descargador de música lossless desde Tidal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-dark-bg font-mono text-white antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
