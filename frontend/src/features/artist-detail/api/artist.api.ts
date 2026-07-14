import client from '@/shared/api/client'
import { mapAlbumDTO, mapTrackDTO } from '@/shared/api/mappers'
import type { ArtistDetailResponseDTO } from '@/shared/types/api.types'
import type { Album, Track } from '@/entities'

export interface ArtistDetail {
  id: string
  name: string
  picture: string | null
}

export interface ArtistDetailData {
  artist: ArtistDetail
  topTracks: Track[]
  albums: Album[]
}

export const artistApi = {
  async getDetail(artistId: string): Promise<ArtistDetailData> {
    const { data } = await client.get<ArtistDetailResponseDTO>(`/artists/${artistId}`)
    const albums = data.albums.map(mapAlbumDTO)
    // Top tracks span multiple albums; each carries its own {id,title} album ref,
    // but the search DTO has no per-track cover, so coverUrl is left empty.
    const topTracks = data.top_tracks.map((dto) =>
      mapTrackDTO(dto, {
        id: dto.album?.id ?? '',
        title: dto.album?.title ?? '',
        coverUrl: '',
      }),
    )
    return {
      artist: {
        id: data.artist.id,
        name: data.artist.name,
        picture: data.artist.picture,
      },
      topTracks,
      albums,
    }
  },
}
