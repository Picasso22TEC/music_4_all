import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { AudioQuality } from '@/entities'

interface SettingsState {
  /** Calidad de descarga por defecto — fuente ÚNICA para dashboard/álbum/artista */
  audioQuality: AudioQuality
  /**
   * Atenúa la escena decorativa y las animaciones decorativas, además de lo que
   * ya hace `prefers-reduced-motion`. Preferencia explícita del usuario para una
   * UI más calmada / mejor rendimiento.
   */
  reduceEffects: boolean
}

interface SettingsActions {
  setAudioQuality: (q: AudioQuality) => void
  setReduceEffects: (v: boolean) => void
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      audioQuality: 'MASTER',
      reduceEffects: false,

      setAudioQuality: (audioQuality) => set({ audioQuality }),
      setReduceEffects: (reduceEffects) => set({ reduceEffects }),
    }),
    {
      name: 'music4all-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
