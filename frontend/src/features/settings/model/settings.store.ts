import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { AudioQuality } from '@/entities'

type ViewMode = 'grid' | 'list'
type ResultsTab = 'albums' | 'tracks' | 'playlists'

interface SettingsState {
  audioQuality: AudioQuality
  downloadPath: string              // empty = OS downloads folder
  concurrentDownloads: number       // 1–5
  viewMode: ViewMode
  lastResultsTab: ResultsTab
}

interface SettingsActions {
  setAudioQuality: (q: AudioQuality) => void
  setDownloadPath: (p: string) => void
  setConcurrentDownloads: (n: number) => void
  setViewMode: (m: ViewMode) => void
  setLastResultsTab: (t: ResultsTab) => void
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      audioQuality: 'MASTER',
      downloadPath: '',
      concurrentDownloads: 2,
      viewMode: 'grid',
      lastResultsTab: 'albums',

      setAudioQuality: (audioQuality) => set({ audioQuality }),
      setDownloadPath: (downloadPath) => set({ downloadPath }),
      setConcurrentDownloads: (n) =>
        set({ concurrentDownloads: Math.max(1, Math.min(5, n)) }),
      setViewMode: (viewMode) => set({ viewMode }),
      setLastResultsTab: (lastResultsTab) => set({ lastResultsTab }),
    }),
    {
      name: 'music4all-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
