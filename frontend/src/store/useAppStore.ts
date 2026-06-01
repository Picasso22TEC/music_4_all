import { create } from 'zustand'
import { getAuthStatus, startDeviceAuth, logout as apiLogout } from '@/lib/api'
import type { DeviceAuthResponse } from '@/lib/api'

interface ActiveDownload {
  jobId: string
  title: string
  progress: number
  status: 'pending' | 'downloading' | 'completed' | 'failed'
}

interface AuthState {
  isAuthenticated: boolean
  pendingAuth: DeviceAuthResponse | null
  checkAuth: () => Promise<void>
  startDeviceAuth: () => Promise<void>
  pollAuthStatus: () => Promise<boolean>
  logout: () => Promise<void>
}

interface DownloadState {
  activeDownloads: ActiveDownload[]
  addDownload: (download: ActiveDownload) => void
  updateDownload: (jobId: string, patch: Partial<ActiveDownload>) => void
  removeDownload: (jobId: string) => void
}

export const useAuthStore = create<AuthState>((set, _get) => ({
  isAuthenticated: false,
  pendingAuth: null,

  checkAuth: async () => {
    const status = await getAuthStatus()
    set({ isAuthenticated: status.authenticated })
  },

  startDeviceAuth: async () => {
    const data = await startDeviceAuth()
    set({ pendingAuth: data })
    window.open(data.verification_uri_complete, '_blank')
  },

  pollAuthStatus: async () => {
    const status = await getAuthStatus()
    if (status.authenticated) {
      set({ isAuthenticated: true, pendingAuth: null })
      return true
    }
    return false
  },

  logout: async () => {
    await apiLogout()
    set({ isAuthenticated: false, pendingAuth: null })
  },
}))

export const useDownloadStore = create<DownloadState>((set) => ({
  activeDownloads: [],

  addDownload: (download) =>
    set((s) => ({ activeDownloads: [...s.activeDownloads, download] })),

  updateDownload: (jobId, patch) =>
    set((s) => ({
      activeDownloads: s.activeDownloads.map((d) =>
        d.jobId === jobId ? { ...d, ...patch } : d
      ),
    })),

  removeDownload: (jobId) =>
    set((s) => ({ activeDownloads: s.activeDownloads.filter((d) => d.jobId !== jobId) })),
}))
