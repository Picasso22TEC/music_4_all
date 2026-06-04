import type { AudioQuality, AudioMode, Artist } from '@/entities/album'

export interface Track {
  readonly id: string
  readonly title: string
  readonly trackNumber: number
  readonly durationSeconds: number
  readonly audioQuality: AudioQuality
  readonly audioModes: readonly AudioMode[]
  readonly isrc: string
  readonly artist: Artist
  readonly albumId: string
  readonly albumTitle: string
  readonly coverUrl: string
}
