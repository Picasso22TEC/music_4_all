import { coverIdToUrl, mapAlbumDTO, mapTrackDTO } from '@/shared/api/mappers'
import client from '@/shared/api/client'
import type { Album, Artist, ArtistResult, PaginatedList, Playlist, ResolveUrlResult, SearchResults, Track, TopHit } from '@/entities'
import type { AlbumDTO, ResolveUrlResponseDTO, SearchResponseDTO, TopHitDTO, TrackDTO } from '@/shared/types/api.types'

function mapPlaylist(dto: Record<string, unknown>): Playlist {
  const cover = dto.cover ? String(dto.cover) : null
  return {
    id: String(dto.id ?? ''),
    title: String(dto.title ?? ''),
    description: null,
    numberOfTracks: Number(dto.number_of_tracks ?? 0),
    creator: { id: '', name: '' } satisfies Artist,
    coverUrl: cover
      ? // 640: tamaño válido del CDN de Tidal (480 devuelve 403). Ver mappers.ts.
        `https://resources.tidal.com/images/${cover.replace(/-/g, '/')}/${640}x${640}.jpg`
      : null,
  }
}

/** Contexto de álbum de un track de búsqueda (portada incluida si viene). */
function trackAlbumCtx(dto: TrackDTO): Pick<Album, 'id' | 'title' | 'coverUrl'> {
  return dto.album
    ? {
        id: dto.album.id,
        title: dto.album.title,
        coverUrl: dto.album.cover ? coverIdToUrl(dto.album.cover) : '',
      }
    : { id: '', title: '', coverUrl: '' }
}

/** Mapea el top_hit del backend a la union tipada del frontend. */
function mapTopHit(dto: TopHitDTO | null | undefined): TopHit | null {
  if (!dto) return null
  switch (dto.type) {
    case 'artist':
      return dto.artist
        ? { type: 'artist', artist: { id: dto.artist.id, name: dto.artist.name, imageUrl: dto.artist.picture ?? null } }
        : null
    case 'album':
      return dto.album ? { type: 'album', album: mapAlbumDTO(dto.album) } : null
    case 'track':
      return dto.track ? { type: 'track', track: mapTrackDTO(dto.track, trackAlbumCtx(dto.track)) } : null
    case 'playlist':
      return dto.playlist ? { type: 'playlist', playlist: mapPlaylist(dto.playlist) } : null
    default:
      return null
  }
}

export const searchApi = {
  async search(query: string, limit = 50): Promise<SearchResults> {
    const { data } = await client.get<SearchResponseDTO>('/search', {
      params: { q: query, limit },
    })

    const artists: PaginatedList<ArtistResult> = {
      items: (data.artists?.items ?? []).map((dto) => ({
        id: dto.id,
        name: dto.name,
        imageUrl: dto.picture ?? null,
      })),
      totalNumberOfItems: data.artists?.total_number_of_items ?? 0,
      limit: data.artists?.limit ?? 0,
      offset: data.artists?.offset ?? 0,
    }

    const albums: PaginatedList<Album> = {
      items: data.albums.items.map((dto) => mapAlbumDTO(dto)),
      totalNumberOfItems: data.albums.total_number_of_items,
      limit: data.albums.limit,
      offset: data.albums.offset,
    }

    const tracks: PaginatedList<Track> = {
      items: data.tracks.items.map((dto) => mapTrackDTO(dto, trackAlbumCtx(dto))),
      totalNumberOfItems: data.tracks.total_number_of_items,
      limit: data.tracks.limit,
      offset: data.tracks.offset,
    }

    const playlists: PaginatedList<Playlist> = {
      items: (data.playlists.items as Record<string, unknown>[]).map(mapPlaylist),
      totalNumberOfItems: data.playlists.total_number_of_items,
      limit: data.playlists.limit,
      offset: data.playlists.offset,
    }

    return { topHit: mapTopHit(data.top_hit), artists, albums, tracks, playlists }
  },

  async resolveUrl(url: string): Promise<ResolveUrlResult> {
    const { data } = await client.get<ResolveUrlResponseDTO>('/resolve', { params: { url } })

    if (data.type === 'album') {
      return {
        type: 'album',
        id: data.id,
        data: mapAlbumDTO(data.data as AlbumDTO),
      }
    }

    if (data.type === 'track') {
      const trackDto = data.data as TrackDTO
      return {
        type: 'track',
        id: data.id,
        data: mapTrackDTO(trackDto, {
          id: trackDto.album?.id ?? '',
          title: trackDto.album?.title ?? '',
          coverUrl: trackDto.album?.cover ? coverIdToUrl(trackDto.album.cover) : '',
        }),
      }
    }

    // Playlist
    return {
      type: 'playlist',
      id: data.id,
      data: mapPlaylist(data.data as unknown as Record<string, unknown>),
    }
  },
}
