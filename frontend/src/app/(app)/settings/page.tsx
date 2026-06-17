'use client'

import { useSettingsStore } from '@/features/settings'
import { Card, QualitySelector } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

export default function SettingsPage() {
  const audioQuality       = useSettingsStore((s) => s.audioQuality)
  const setAudioQuality    = useSettingsStore((s) => s.setAudioQuality)
  const concurrentDownloads    = useSettingsStore((s) => s.concurrentDownloads)
  const setConcurrentDownloads = useSettingsStore((s) => s.setConcurrentDownloads)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-sans text-2xl font-bold text-primary">Ajustes</h1>
        <p className="mt-1 font-sans text-sm text-secondary">
          Configura tus preferencias de descarga
        </p>
      </div>

      {/* Audio quality */}
      <Card>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-sans text-base font-semibold text-primary">
              Calidad de descarga
            </h2>
            <p className="mt-1 font-sans text-sm text-secondary">
              Selecciona la calidad de audio preferida para tus descargas.
            </p>
          </div>
          <QualitySelector value={audioQuality} onChange={setAudioQuality} />
        </div>
      </Card>

      {/* Concurrent downloads */}
      <Card>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-sans text-base font-semibold text-primary">
              Descargas simultáneas
            </h2>
            <p className="mt-1 font-sans text-sm text-secondary">
              Número máximo de álbumes descargando al mismo tiempo.
            </p>
          </div>
          <div
            role="group"
            aria-label="Número de descargas simultáneas"
            className="flex gap-2"
          >
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setConcurrentDownloads(n)}
                aria-pressed={n === concurrentDownloads}
                className={cn(
                  'h-10 w-10 rounded-md font-mono text-sm font-medium',
                  'transition-all duration-100',
                  'focus-visible:outline-none focus-visible:shadow-glow-focus',
                  n === concurrentDownloads
                    ? 'border border-teal-500 bg-teal-500/15 text-teal-400'
                    : 'border border-subtle text-secondary hover:border-teal-500 hover:text-teal-400',
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
