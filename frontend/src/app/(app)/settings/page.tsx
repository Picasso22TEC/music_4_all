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
        <h1 className="font-sans text-2xl font-bold text-primary">Settings</h1>
        <p className="mt-1 font-sans text-sm text-secondary">
          Configure your download preferences
        </p>
      </div>

      {/* Audio quality */}
      <Card>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-sans text-base font-semibold text-primary">
              Download quality
            </h2>
            <p className="mt-1 font-sans text-sm text-secondary">
              Choose your preferred audio quality for downloads.
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
              Concurrent downloads
            </h2>
            <p className="mt-1 font-sans text-sm text-secondary">
              Maximum number of albums downloading at the same time.
            </p>
          </div>
          <div
            role="group"
            aria-label="Number of concurrent downloads"
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
