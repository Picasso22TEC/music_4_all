'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { NeonTitle } from '@/components/NeonTitle'
import { useAuthStore } from '@/store/useAppStore'

export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated, pendingAuth, checkAuth, startDeviceAuth, pollAuthStatus } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [polling, setPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuth().then(() => {
      if (isAuthenticated) router.replace('/dashboard')
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pendingAuth) return

    setPolling(true)
    const interval = setInterval(async () => {
      const done = await pollAuthStatus()
      if (done) {
        clearInterval(interval)
        setPolling(false)
        router.replace('/dashboard')
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [pendingAuth]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogin() {
    setLoading(true)
    setError(null)
    try {
      await startDeviceAuth()
    } catch {
      setError('Error al iniciar sesión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 p-8">
      <NeonTitle />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-lg border border-dark-border bg-dark-surface p-8"
      >
        <h2 className="mb-6 text-center text-xl font-bold text-neon-cyan">Iniciar Sesión</h2>

        {error && (
          <p className="mb-4 rounded border border-red-500 bg-red-900/20 p-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {pendingAuth ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-gray-300">
              Abre este enlace en tu navegador y autoriza la app:
            </p>
            <a
              href={pendingAuth.verification_uri_complete}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-neon-cyan underline hover:text-neon-green"
            >
              {pendingAuth.verification_uri_complete}
            </a>
            <p className="text-xs text-gray-500">
              Código: <span className="font-bold text-neon-magenta">{pendingAuth.user_code}</span>
            </p>
            {polling && (
              <p className="animate-pulse text-sm text-gray-500">Esperando autorización...</p>
            )}
          </div>
        ) : (
          <>
            <p className="mb-6 text-center text-sm text-gray-400">
              Se abrirá una ventana de autorización de Tidal.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogin}
              disabled={loading}
              className="w-full rounded border border-neon-green bg-transparent px-6 py-3 font-mono font-bold text-neon-green shadow-neon-green transition-all hover:bg-neon-green/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? '⟳ Conectando...' : '⬇ Conectar con Tidal'}
            </motion.button>
          </>
        )}
      </motion.div>
    </main>
  )
}
