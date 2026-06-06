import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import type { DownloadJob, AudioQuality } from '@/entities'

// ─── State ────────────────────────────────────────────────────────────────────

interface DownloadsState {
  queue: DownloadJob[]
  isPanelVisible: boolean
  isPanelExpanded: boolean
  /** True while the unified /ws/downloads connection is open (Phase 6E) */
  wsConnected: boolean
  /**
   * backendJobId that received an auth error from the WS (Phase 6H).
   * DownloadPanel watches this and calls openSessionRecovery() when set.
   */
  pendingAuthRecovery: string | null
}

// ─── Actions ──────────────────────────────────────────────────────────────────

interface DownloadsActions {
  enqueue: (data: {
    backendJobId: string
    albumId: string
    albumTitle: string
    artistName: string
    totalTracks: number
    qualityOverride: AudioQuality | null
  }) => DownloadJob

  updateByBackendId: (
    backendJobId: string,
    updates: Partial<
      Pick<
        DownloadJob,
        | 'completedTracks'
        | 'currentTrackFilename'
        | 'progressPercent'
        | 'speedMbps'
        | 'etaSeconds'
        | 'status'
        | 'error'
        | 'startedAt'
        | 'completedAt'
        | 'outputPath'
      >
    >
  ) => void

  removeJob: (id: string) => void
  clearCompleted: () => void
  setPanelVisible: (visible: boolean) => void
  setPanelExpanded: (expanded: boolean) => void
  setWsConnected: (connected: boolean) => void
  setPendingAuthRecovery: (jobId: string | null) => void
}

// ─── Transiciones de estado válidas ──────────────────────────────────────────
//
//  queued → active    (WS: job starts)
//  active → paused    (PATCH pause)
//  active → completed (WS: all tracks done)
//  active → error     (WS: download failed)
//  paused → active    (PATCH resume)
//  error  → active    (PATCH retry)
//  error  → removed   (DELETE / removeJob)
//  completed → removed (clearCompleted / removeJob after 10s)

const VALID_TRANSITIONS: Record<DownloadJob['status'], DownloadJob['status'][]> = {
  queued: ['active'],
  active: ['paused', 'completed', 'error'],
  paused: ['active'],
  completed: [],
  error: ['active'],
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDownloadsStore = create<DownloadsState & DownloadsActions>((set) => ({
  queue: [],
  isPanelVisible: false,
  isPanelExpanded: true,
  wsConnected: false,
  pendingAuthRecovery: null,

  enqueue: (data) => {
    const newJob: DownloadJob = {
      id: crypto.randomUUID(),
      backendJobId: data.backendJobId,
      albumId: data.albumId,
      albumTitle: data.albumTitle,
      artistName: data.artistName,
      totalTracks: data.totalTracks,
      qualityOverride: data.qualityOverride,
      completedTracks: 0,
      currentTrackFilename: null,
      progressPercent: 0,
      speedMbps: null,
      etaSeconds: null,
      status: 'queued',
      error: null,
      startedAt: null,
      completedAt: null,
      outputPath: null,
    }
    set((s) => ({
      queue: [...s.queue, newJob],
      isPanelVisible: true,
    }))
    return newJob
  },

  updateByBackendId: (backendJobId, updates) => {
    set((s) => ({
      queue: s.queue.map((job) => {
        if (job.backendJobId !== backendJobId) return job
        // Validar transición de status
        if (updates.status && updates.status !== job.status) {
          const allowed = VALID_TRANSITIONS[job.status]
          if (!allowed.includes(updates.status)) {
            console.warn(`Invalid transition: ${job.status} → ${updates.status}`)
            return job
          }
        }
        return { ...job, ...updates }
      }),
    }))
  },

  removeJob: (id) =>
    set((s) => {
      const newQueue = s.queue.filter((j) => j.id !== id)
      return {
        queue: newQueue,
        isPanelVisible: newQueue.some((j) => j.status !== 'completed'),
      }
    }),

  clearCompleted: () =>
    set((s) => ({
      queue: s.queue.filter((j) => j.status !== 'completed'),
    })),

  setPanelVisible: (isPanelVisible) => set({ isPanelVisible }),
  setPanelExpanded: (isPanelExpanded) => set({ isPanelExpanded }),
  setWsConnected: (wsConnected) => set({ wsConnected }),
  setPendingAuthRecovery: (pendingAuthRecovery) => set({ pendingAuthRecovery }),
}))

// ─── Selectors ────────────────────────────────────────────────────────────────
// Usar con useShallow para evitar re-renders por referencia de array.

export const useActiveJobs = () =>
  useDownloadsStore(useShallow((s) => s.queue.filter((j) => j.status === 'active')))

export const useQueuedJobs = () =>
  useDownloadsStore(useShallow((s) => s.queue.filter((j) => j.status === 'queued')))

export const useCompletedJobs = () =>
  useDownloadsStore(useShallow((s) => s.queue.filter((j) => j.status === 'completed')))

export const useErrorJobs = () =>
  useDownloadsStore(useShallow((s) => s.queue.filter((j) => j.status === 'error')))

// Glow rule: máx 2 glows simultáneos (wireframes-v2 §3)
// Si el player está activo, solo 1 job puede tener glow.
// Si el player está inactivo, hasta 2 jobs pueden tener glow.
export function selectGlowEligibleIds(
  queue: DownloadJob[],
  isPlayerActive: boolean
): Set<string> {
  const active = queue.filter((j) => j.status === 'active')
  const maxGlows = isPlayerActive ? 1 : 2
  return new Set(active.slice(0, maxGlows).map((j) => j.id))
}

export const useAverageProgress = () =>
  useDownloadsStore((s) => {
    const active = s.queue.filter((j) => j.status === 'active')
    if (active.length === 0) return 0
    return Math.round(active.reduce((sum, j) => sum + j.progressPercent, 0) / active.length)
  })

// isPanelVisible para la lógica condicional del Toast de error
export const useIsPanelVisible = () => useDownloadsStore((s) => s.isPanelVisible)
