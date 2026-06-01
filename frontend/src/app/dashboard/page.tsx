'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { NeonTitle } from '@/components/NeonTitle'
import { VinylCard } from '@/components/VinylCard'
import { DownloadButton } from '@/components/DownloadButton'
import { ProgressBar } from '@/components/ProgressBar'
import { useAuthStore, useDownloadStore } from '@/store/useAppStore'
import { searchApi, startDownload, getFileUrl } from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { SearchResult } from '@/lib/api'

export default function DashboardPage() {
  const router = useRouter()
  const { isAuthenticated, checkAuth, logout } = useAuthStore()
  const { activeDownloads, addDownload, updateDownload } = useDownloadStore()

  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  // WebSocket para el job activo
  const wsUrl = activeJobId ? `ws://localhost:8000/ws/progress/${activeJobId}` : ''
  const { data: wsData } = useWebSocket(wsUrl)

  useEffect(() => {
    checkAuth().then(() => {
      if (!isAuthenticated) router.replace('/login')
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Actualiza el estado del download según mensajes WS
  useEffect(() => {
    if (!wsData || !activeJobId) return
    updateDownload(activeJobId, {
      progress: wsData.progress,
      status: wsData.status,
    })
    if (wsData.status === 'completed' || wsData.status === 'failed') {
      setActiveJobId(null)
    }
  }, [wsData]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: results, isFetching } = useQuery({
    queryKey: ['search', query],
    queryFn: () => searchApi(query),
    enabled: query.length > 2,
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setQuery(searchInput.trim())
  }

  async function handleDownload() {
    if (!selected) return
    const job = await startDownload(selected.url)
    addDownload({ jobId: job.job_id, title: job.title, progress: 0, status: 'pending' })
    setActiveJobId(job.job_id)
    setSelected(null)
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <NeonTitle />
        </div>

        <nav className="mb-8 flex justify-end gap-6 text-sm">
          <a href="/history" className="text-gray-400 transition-colors hover:text-neon-cyan">
            Historial
          </a>
          <button onClick={logout} className="text-gray-500 transition-colors hover:text-red-400">
            Cerrar sesión
          </button>
        </nav>

        <form onSubmit={handleSearch} className="mb-8 flex gap-3">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Pega una URL de Tidal o busca álbumes y canciones..."
            className="flex-1 rounded border border-dark-border bg-dark-surface px-4 py-3 font-mono text-white placeholder-gray-600 outline-none transition-all focus:border-neon-cyan"
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={isFetching}
            className="rounded border border-neon-cyan px-6 py-3 font-mono text-neon-cyan transition-all hover:bg-neon-cyan/10 disabled:opacity-50"
          >
            {isFetching ? '⟳' : '⌕'}
          </motion.button>
        </form>

        {activeDownloads.length > 0 && (
          <section className="mb-8 space-y-3">
            <h3 className="text-sm font-bold text-neon-magenta">Descargas activas</h3>
            {activeDownloads.map((d) => (
              <div
                key={d.jobId}
                className="rounded border border-dark-border bg-dark-surface p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="truncate text-sm text-gray-300">{d.title}</span>
                  {d.status === 'completed' && (
                    <a
                      href={getFileUrl(d.jobId)}
                      className="ml-4 shrink-0 text-xs text-neon-green underline"
                    >
                      Descargar archivo
                    </a>
                  )}
                </div>
                <ProgressBar progress={d.progress} />
                {d.status === 'failed' && (
                  <p className="mt-1 text-xs text-red-400">Error en la descarga</p>
                )}
              </div>
            ))}
          </section>
        )}

        {results && results.length > 0 && (
          <section>
            <h3 className="mb-4 text-sm font-bold text-neon-cyan">
              Resultados ({results.length})
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((item) => (
                <VinylCard
                  key={item.id}
                  album={item}
                  selected={selected?.id === item.id}
                  onSelect={setSelected}
                />
              ))}
            </div>

            {selected && (
              <div className="mt-6 flex justify-center">
                <DownloadButton onClick={handleDownload} label={`Descargar: ${selected.title}`} />
              </div>
            )}
          </section>
        )}

        {results?.length === 0 && query && (
          <p className="text-center text-gray-500">
            No se encontraron resultados para &quot;{query}&quot;
          </p>
        )}
      </div>
    </main>
  )
}
