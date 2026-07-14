import client from '@/shared/api/client'
import { coverIdToUrl, mapAlbumDTO, mapTrackDTO } from '@/shared/api/mappers'
import type { ArtistDetailResponseDTO } from '@/shared/types/api.types'
import type { Album, ArtistResult, Track } from '@/entities'

export interface ArtistDetail {
  id: string
  name: string
  picture: string | null
}

export interface ArtistDetailData {
  artist: ArtistDetail
  bio: string | null
  topTracks: Track[]
  albums: Album[]
  epSingles: Album[]
  similar: ArtistResult[]
}

export const artistApi = {
  async getDetail(artistId: string): Promise<ArtistDetailData> {
    const { data } = await client.get<ArtistDetailResponseDTO>(`/artists/${artistId}`)
    const albums = data.albums.map(mapAlbumDTO)
    const epSingles = (data.ep_singles ?? []).map(mapAlbumDTO)
    // Top tracks span multiple albums; each carries its own {id,title,cover} album
    // ref, so cada pista muestra la portada de su propio álbum.
    const topTracks = data.top_tracks.map((dto) =>
      mapTrackDTO(dto, {
        id: dto.album?.id ?? '',
        title: dto.album?.title ?? '',
        coverUrl: dto.album?.cover ? coverIdToUrl(dto.album.cover) : '',
      }),
    )
    // Similar artists — picture is already a full URL from the backend.
    const similar: ArtistResult[] = (data.similar ?? []).map((dto) => ({
      id: dto.id,
      name: dto.name,
      imageUrl: dto.picture ?? null,
    }))
    return {
      artist: {
        id: data.artist.id,
        name: data.artist.name,
        picture: data.artist.picture,
      },
      bio: data.bio ?? null,
      topTracks,
      albums,
      epSingles,
      similar,
    }
  },
}
