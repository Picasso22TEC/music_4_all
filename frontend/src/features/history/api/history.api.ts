import client from '@/shared/api/client'

import type { HistoryRecord } from '../model/history.types'

// ─── Backend DTO (snake_case) ─────────────────────────────────────────────────
// Mirrors DownloadRecordSchema in backend/app/modules/history/schemas.py

interface HistoryRecordDTO {
  id: string
  title: string
  artist: string
  quality: string
  cover_url: string | null
  job_id: string | null
  downloaded_at: string    // FastAPI serializes datetime → ISO 8601
}

// ─── Mapper DTO → domain ──────────────────────────────────────────────────────

function mapRecord(dto: HistoryRecordDTO): HistoryRecord {
  return {
    id:           dto.id,
    title:        dto.title,
    artist:       dto.artist,
    quality:      dto.quality,
    coverUrl:     dto.cover_url,
    jobId:        dto.job_id,
    downloadedAt: dto.downloaded_at,
  }
}

// ─── API functions ────────────────────────────────────────────────────────────

export const historyApi = {
  /**
   * GET /history?limit={limit}
   * Returns paginated download history ordered by most recent.
   */
  async getHistory(limit = 100): Promise<HistoryRecord[]> {
    const { data } = await client.get<HistoryRecordDTO[]>('/history', {
      params: { limit },
    })
    return data.map(mapRecord)
  },
}
