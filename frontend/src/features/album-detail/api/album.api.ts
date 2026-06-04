import { mapAlbumDTO, mapTrackDTO } from '@/shared/api/mappers'
import client from '@/shared/api/client'
import type { AlbumDetailResponseDTO } from '@/shared/types/api.types'
import type { Album, Track } from '@/entities'

export const albumApi = {
  async getDetail(albumId: string): Promise<{ album: Album; tracks: Track[] }> {
    const { data } = await client.get<AlbumDetailResponseDTO>(`/albums/${albumId}`)
    const album = mapAlbumDTO(data.album)
    const tracks = data.tracks.map((dto) =>
      mapTrackDTO(dto, { id: album.id, title: album.title, coverUrl: album.coverUrl })
    )
    return { album, tracks }
  },
}
