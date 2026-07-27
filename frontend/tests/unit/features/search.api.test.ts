import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SearchResponseDTO, TopHitDTO } from '@/shared/types/api.types'

// El client HTTP se mockea para probar solo el mapeo del top_hit.
const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }))
vi.mock('@/shared/api/client', () => ({ default: { get: mockGet } }))

import { searchApi } from '@/features/search/api/search.api'

const EMPTY_SECTION = { items: [], total_number_of_items: 0, limit: 50, offset: 0 }

function responseWith(topHit: TopHitDTO | null): SearchResponseDTO {
  return {
    top_hit: topHit,
    artists: { ...EMPTY_SECTION },
    albums: { ...EMPTY_SECTION },
    tracks: { ...EMPTY_SECTION },
    playlists: { ...EMPTY_SECTION },
  }
}

async function searchWithTopHit(topHit: TopHitDTO | null) {
  mockGet.mockResolvedValueOnce({ data: responseWith(topHit) })
  return searchApi.search('anything')
}

describe('searchApi.search — top_hit mapping', () => {
  beforeEach(() => mockGet.mockReset())

  it('maps a track top hit', async () => {
    const result = await searchWithTopHit({
      type: 'track',
      track: {
        id: '555',
        title: 'Best Match',
        track_number: 3,
        duration: 210,
        audio_quality: 'HIGH',
        artist: { id: '9', name: 'Thom Yorke' },
        album: { id: '42', title: 'The Bends', cover: 'abc-def' },
      },
    })

    expect(result.topHit).not.toBeNull()
    expect(result.topHit?.type).toBe('track')
    if (result.topHit?.type === 'track') {
      expect(result.topHit.track.id).toBe('555')
      expect(result.topHit.track.title).toBe('Best Match')
      expect(result.topHit.track.albumId).toBe('42')
    }
  })

  it('maps an artist top hit (picture → imageUrl)', async () => {
    const picture = 'https://resources.tidal.com/images/x/y/750x750.jpg'
    const result = await searchWithTopHit({
      type: 'artist',
      artist: { id: '77', name: 'Top Band', picture },
    })

    expect(result.topHit?.type).toBe('artist')
    if (result.topHit?.type === 'artist') {
      expect(result.topHit.artist.id).toBe('77')
      expect(result.topHit.artist.imageUrl).toBe(picture)
    }
  })

  it('maps an album top hit', async () => {
    const result = await searchWithTopHit({
      type: 'album',
      album: {
        id: '42',
        title: 'The Bends',
        artist: { id: '9', name: 'Radiohead' },
        cover: 'abc-def',
        release_date: '1995-03-13',
        number_of_tracks: 12,
        duration: 2000,
        audio_quality: 'HIGH',
      },
    })

    expect(result.topHit?.type).toBe('album')
    if (result.topHit?.type === 'album') {
      expect(result.topHit.album.id).toBe('42')
      expect(result.topHit.album.title).toBe('The Bends')
    }
  })

  it('returns null when there is no top hit', async () => {
    const result = await searchWithTopHit(null)
    expect(result.topHit).toBeNull()
  })

  it('returns null when the type payload is missing (defensive)', async () => {
    // type says track pero no viene el objeto track
    const result = await searchWithTopHit({ type: 'track' })
    expect(result.topHit).toBeNull()
  })
})
