import { beforeEach, describe, expect, it } from 'vitest'

import { useDownloadsStore } from '@/features/downloads/model/downloads.store'
import type { AudioQuality } from '@/entities'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_JOB = {
  backendJobId: 'backend-job-1',
  albumId: 'album-251380837',
  albumTitle: 'Toxicity',
  artistName: 'System of a Down',
  totalTracks: 14,
  qualityOverride: 'MASTER' as AudioQuality,
}

const MOCK_JOB_2 = {
  backendJobId: 'backend-job-2',
  albumId: 'album-987654321',
  albumTitle: 'Mezmerize',
  artistName: 'System of a Down',
  totalTracks: 11,
  qualityOverride: 'HIGH' as AudioQuality,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resetDownloadsStore() {
  useDownloadsStore.setState({
    queue: [],
    isPanelVisible: false,
    isPanelExpanded: true,
    wsConnected: false,
    pendingAuthRecovery: null,
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('downloads.store', () => {
  beforeEach(resetDownloadsStore)

  describe('initial state', () => {
    it('queue is empty', () => {
      expect(useDownloadsStore.getState().queue).toHaveLength(0)
    })

    it('panel is not visible', () => {
      expect(useDownloadsStore.getState().isPanelVisible).toBe(false)
    })

    it('wsConnected is false', () => {
      expect(useDownloadsStore.getState().wsConnected).toBe(false)
    })
  })

  describe('enqueue', () => {
    it('adds the job to the queue', () => {
      useDownloadsStore.getState().enqueue(MOCK_JOB)
      expect(useDownloadsStore.getState().queue).toHaveLength(1)
    })

    it('returns the created job with a generated id', () => {
      const job = useDownloadsStore.getState().enqueue(MOCK_JOB)
      expect(job.id).toBeDefined()
      expect(job.backendJobId).toBe(MOCK_JOB.backendJobId)
    })

    it('sets status to queued', () => {
      const job = useDownloadsStore.getState().enqueue(MOCK_JOB)
      expect(job.status).toBe('queued')
    })

    it('makes the panel visible', () => {
      useDownloadsStore.getState().enqueue(MOCK_JOB)
      expect(useDownloadsStore.getState().isPanelVisible).toBe(true)
    })

    it('initialises progress fields to zero / null', () => {
      const job = useDownloadsStore.getState().enqueue(MOCK_JOB)
      expect(job.completedTracks).toBe(0)
      expect(job.progressPercent).toBe(0)
      expect(job.speedMbps).toBeNull()
      expect(job.etaSeconds).toBeNull()
      expect(job.error).toBeNull()
    })

    it('queuing multiple jobs accumulates them', () => {
      useDownloadsStore.getState().enqueue(MOCK_JOB)
      useDownloadsStore.getState().enqueue(MOCK_JOB_2)
      expect(useDownloadsStore.getState().queue).toHaveLength(2)
    })
  })

  describe('updateByBackendId', () => {
    it('applies a valid status transition (queued → active)', () => {
      useDownloadsStore.getState().enqueue(MOCK_JOB)
      useDownloadsStore.getState().updateByBackendId(MOCK_JOB.backendJobId, { status: 'active' })
      expect(useDownloadsStore.getState().queue[0].status).toBe('active')
    })

    it('updates progress fields', () => {
      useDownloadsStore.getState().enqueue(MOCK_JOB)
      useDownloadsStore.getState().updateByBackendId(MOCK_JOB.backendJobId, {
        completedTracks: 7,
        progressPercent: 50,
        speedMbps: 2.4,
        etaSeconds: 30,
      })
      const job = useDownloadsStore.getState().queue[0]
      expect(job.completedTracks).toBe(7)
      expect(job.progressPercent).toBe(50)
      expect(job.speedMbps).toBe(2.4)
      expect(job.etaSeconds).toBe(30)
    })

    it('ignores invalid status transitions (queued → completed)', () => {
      useDownloadsStore.getState().enqueue(MOCK_JOB)
      useDownloadsStore.getState().updateByBackendId(MOCK_JOB.backendJobId, {
        status: 'completed',
      })
      // queued → completed is not in VALID_TRANSITIONS
      expect(useDownloadsStore.getState().queue[0].status).toBe('queued')
    })

    it('does not affect other jobs', () => {
      useDownloadsStore.getState().enqueue(MOCK_JOB)
      useDownloadsStore.getState().enqueue(MOCK_JOB_2)
      useDownloadsStore.getState().updateByBackendId(MOCK_JOB.backendJobId, { status: 'active' })

      const queue = useDownloadsStore.getState().queue
      expect(queue.find((j) => j.backendJobId === MOCK_JOB_2.backendJobId)?.status).toBe('queued')
    })
  })

  describe('removeJob', () => {
    it('removes the job from the queue', () => {
      const job = useDownloadsStore.getState().enqueue(MOCK_JOB)
      useDownloadsStore.getState().removeJob(job.id)
      expect(useDownloadsStore.getState().queue).toHaveLength(0)
    })

    it('hides the panel when the last non-completed job is removed', () => {
      const job = useDownloadsStore.getState().enqueue(MOCK_JOB)
      useDownloadsStore.getState().removeJob(job.id)
      expect(useDownloadsStore.getState().isPanelVisible).toBe(false)
    })

    it('keeps the panel visible when other non-completed jobs remain', () => {
      const job1 = useDownloadsStore.getState().enqueue(MOCK_JOB)
      useDownloadsStore.getState().enqueue(MOCK_JOB_2)
      useDownloadsStore.getState().removeJob(job1.id)
      expect(useDownloadsStore.getState().isPanelVisible).toBe(true)
    })

    it('does not mutate other jobs in the queue', () => {
      const job1 = useDownloadsStore.getState().enqueue(MOCK_JOB)
      useDownloadsStore.getState().enqueue(MOCK_JOB_2)
      useDownloadsStore.getState().removeJob(job1.id)

      const remaining = useDownloadsStore.getState().queue
      expect(remaining).toHaveLength(1)
      expect(remaining[0].backendJobId).toBe(MOCK_JOB_2.backendJobId)
    })
  })

  describe('clearCompleted', () => {
    it('removes only completed jobs', () => {
      const job1 = useDownloadsStore.getState().enqueue(MOCK_JOB)
      useDownloadsStore.getState().enqueue(MOCK_JOB_2)

      // Drive job1 to completed via valid transitions: queued → active → completed
      useDownloadsStore.getState().updateByBackendId(job1.backendJobId, { status: 'active' })
      useDownloadsStore.getState().updateByBackendId(job1.backendJobId, { status: 'completed' })

      useDownloadsStore.getState().clearCompleted()

      const queue = useDownloadsStore.getState().queue
      expect(queue).toHaveLength(1)
      expect(queue[0].backendJobId).toBe(MOCK_JOB_2.backendJobId)
    })
  })

  describe('isPanelVisible selector', () => {
    it('reflects true when queue has queued jobs', () => {
      useDownloadsStore.getState().enqueue(MOCK_JOB)
      expect(useDownloadsStore.getState().isPanelVisible).toBe(true)
    })

    it('reflects false when queue is empty', () => {
      expect(useDownloadsStore.getState().isPanelVisible).toBe(false)
    })
  })
})
