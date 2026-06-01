'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { historyApi } from '@/lib/api'

export default function HistoryPage() {
  const { data: history, isLoading, isError } = useQuery({
    queryKey: ['history'],
    queryFn: historyApi,
    refetchInterval: 10_000, // refresca cada 10s para ver descargas recientes
  })

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-mono text-2xl font-bold text-neon-cyan">
            Historial de Descargas
          </h1>
          <a
            href="/dashboard"
            className="font-mono text-sm text-gray-400 transition-colors hover:text-neon-cyan"
          >
            ← Volver
          </a>
        </div>

        {isLoading && (
          <p className="animate-pulse text-center font-mono text-gray-500">
            Cargando historial...
          </p>
        )}

        {isError && (
          <p className="text-center font-mono text-red-400">
            Error al cargar el historial.
          </p>
        )}

        {history?.length === 0 && (
          <p className="text-center font-mono text-gray-500">
            Aún no hay descargas registradas.
          </p>
        )}

        <div className="space-y-3">
          {history?.map((record, i) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-4 rounded border border-dark-border bg-dark-surface p-4"
            >
              {record.cover_url ? (
                <Image
                  src={record.cover_url}
                  alt={record.title}
                  width={48}
                  height={48}
                  className="h-12 w-12 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-dark-border text-xl">
                  ♪
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate font-mono font-bold text-white">{record.title}</p>
                <p className="truncate font-mono text-sm text-gray-400">{record.artist}</p>
              </div>

              <div className="shrink-0 text-right">
                <span className="block font-mono text-xs font-bold text-neon-green">
                  {record.quality}
                </span>
                <span className="block font-mono text-xs text-gray-500">
                  {new Date(record.downloaded_at).toLocaleDateString('es', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  )
}
