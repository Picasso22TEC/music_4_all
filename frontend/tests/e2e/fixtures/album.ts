import type { AlbumDTO, SearchResponseDTO } from '@/shared/types/api.types'

/**
 * "Toxicity" by System of a Down — fixture album used across search and
 * download E2E specs.
 *
 * `cover: ''` deliberately — AlbumCard only renders <Image> when
 * `album.coverUrl` is truthy, so an empty cover avoids any real network
 * request to resources.tidal.com during tests.
 */
export const TOXICITY_ALBUM_DTO: AlbumDTO = {
  id: '251380837',
  title: 'Toxicity',
  artist: { id: '11069', name: 'System of a Down' },
  cover: '',
  release_date: '2001-09-04',
  number_of_tracks: 14,
  duration: 2580,
  audio_quality: 'HIGH',
  audio_modes: [],
  upc: '743magic0123456',
  label: { id: '1', name: 'American Recordings' },
  genre: 'Rock',
}

export function buildSearchResponse(albums: AlbumDTO[] = [TOXICITY_ALBUM_DTO]): SearchResponseDTO {
  return {
    albums: {
      items: albums,
      total_number_of_items: albums.length,
      limit: 50,
      offset: 0,
    },
    tracks: { items: [], total_number_of_items: 0, limit: 50, offset: 0 },
    playlists: { items: [], total_number_of_items: 0, limit: 50, offset: 0 },
  }
}
