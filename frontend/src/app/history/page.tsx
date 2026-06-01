'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { historyApi } from '@/lib/api'
import type { DownloadRecord } from '@/lib/api'

export default function HistoryPage() {
  const { data: history, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: historyApi,
  })

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neon-cyan">Historial de Descargas</h1>
          <a href="/dashboard" className="text-sm text-gray-400 transition-colors hover:text-neon-cyan">
            ← Volver
          </a>
        </div>

        {isLoading && (
          <p className="text-center text-gray-500">Cargando historial...</p>
        )}

        {history && history.length === 0 && (
          <p className="text-center text-gray-500">No hay descargas registradas aún.</p>
        )}

        <div className="space-y-3">
          {history?.map((record: DownloadRecord, i: number) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 rounded border border-dark-border bg-dark-surface p-4"
            >
              {record.coverUrl && (
                <Image
                  src={record.coverUrl}
                  alt={record.title}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded object-cover"
                />
              )}
              <div className="flex-1 overflow-hidden">
                <p className="truncate font-bold text-white">{record.title}</p>
                <p className="text-sm text-gray-400">{record.artist}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-neon-green">{record.quality}</span>
                <p className="text-xs text-gray-500">{new Date(record.downloadedAt).toLocaleDateString('es')}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  )
}
