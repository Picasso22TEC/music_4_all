// ─── Domain types for download history ────────────────────────────────────────
// Derived from backend DownloadRecordSchema (history/schemas.py).
// NOTE: `quality` is a free-form display string (e.g. "96kHz / 24bit (Hi-Res)")
// set by the download worker — NOT an AudioQuality enum value.

export interface HistoryRecord {
  id: string
  title: string
  artist: string
  /** Free-form quality description from the download worker */
  quality: string
  /** Tidal cover URL or null if unavailable */
  coverUrl: string | null
  /** Backend job UUID or null for legacy records */
  jobId: string | null
  /** ISO 8601 datetime string */
  downloadedAt: string
}
