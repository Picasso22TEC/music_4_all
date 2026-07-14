import { describe, expect, it } from 'vitest'

import { groupIntoAlbums } from '@/app/(app)/library/groupAlbums'
import type { HistoryRecord } from '@/features/history'

// ─── Fixture builder ──────────────────────────────────────────────────────────

let seq = 0
function rec(over: Partial<HistoryRecord> = {}): HistoryRecord {
  seq += 1
  return {
    id: `id-${seq}`,
    title: `Track ${seq}`,
    artist: 'Radiohead',
    quality: 'FLAC',
    coverUrl: 'https://cover/ok-computer.jpg',
    jobId: 'job-1',
    downloadedAt: '2026-07-14T10:00:00Z',
    ...over,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('groupIntoAlbums', () => {
  it('returns an empty array for no records', () => {
    expect(groupIntoAlbums([])).toEqual([])
  })

  it('groups tracks sharing a cover into one album with the right count', () => {
    const albums = groupIntoAlbums([rec(), rec(), rec()])
    expect(albums).toHaveLength(1)
    expect(albums[0].trackCount).toBe(3)
    expect(albums[0].coverUrl).toBe('https://cover/ok-computer.jpg')
    expect(albums[0].quality).toBe('FLAC')
  })

  it('dedups re-downloads of the same album (same cover, different job)', () => {
    const albums = groupIntoAlbums([
      rec({ jobId: 'job-a' }),
      rec({ jobId: 'job-b' }),
    ])
    expect(albums).toHaveLength(1)
    expect(albums[0].trackCount).toBe(2)
  })

  it('keeps the most recent download date for the album', () => {
    const albums = groupIntoAlbums([
      rec({ downloadedAt: '2026-07-14T10:00:00Z' }),
      rec({ downloadedAt: '2026-07-14T12:30:00Z' }),
      rec({ downloadedAt: '2026-07-14T09:00:00Z' }),
    ])
    expect(albums[0].downloadedAt).toBe('2026-07-14T12:30:00Z')
  })

  it('falls back to jobId when the cover is null', () => {
    const albums = groupIntoAlbums([
      rec({ coverUrl: null, jobId: 'job-x' }),
      rec({ coverUrl: null, jobId: 'job-x' }),
      rec({ coverUrl: null, jobId: 'job-y' }),
    ])
    expect(albums).toHaveLength(2)
    expect(albums.map((a) => a.trackCount).sort()).toEqual([1, 2])
  })

  it('adopts a non-null cover found on a later track of the same job', () => {
    const albums = groupIntoAlbums([
      rec({ coverUrl: null, jobId: 'job-z' }),
      rec({ coverUrl: 'https://cover/late.jpg', jobId: 'job-z' }),
    ])
    expect(albums).toHaveLength(1)
    expect(albums[0].coverUrl).toBe('https://cover/late.jpg')
  })

  it('treats legacy records with no cover and no job as separate singles', () => {
    const albums = groupIntoAlbums([
      rec({ coverUrl: null, jobId: null }),
      rec({ coverUrl: null, jobId: null }),
    ])
    expect(albums).toHaveLength(2)
  })

  it('labels the album with its dominant artist (feats do not win)', () => {
    const albums = groupIntoAlbums([
      rec({ artist: 'Kendrick Lamar' }),
      rec({ artist: 'Kendrick Lamar' }),
      rec({ artist: 'Kendrick Lamar feat. SZA' }),
    ])
    expect(albums[0].artist).toBe('Kendrick Lamar')
  })

  it('sorts albums with the most recently downloaded first', () => {
    const albums = groupIntoAlbums([
      rec({ jobId: 'job-old', coverUrl: 'https://cover/old.jpg', downloadedAt: '2026-01-01T00:00:00Z' }),
      rec({ jobId: 'job-new', coverUrl: 'https://cover/new.jpg', downloadedAt: '2026-07-14T00:00:00Z' }),
    ])
    expect(albums.map((a) => a.coverUrl)).toEqual([
      'https://cover/new.jpg',
      'https://cover/old.jpg',
    ])
  })
})
