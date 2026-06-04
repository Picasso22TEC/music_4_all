import type { Artist } from '@/entities/album'

export interface Playlist {
  readonly id: string
  readonly title: string
  readonly description: string | null
  readonly numberOfTracks: number
  readonly creator: Artist
  readonly coverUrl: string | null
}
