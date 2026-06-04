import type { Track } from './track.types'

export function formatTrackNumber(track: Track): string {
  return String(track.trackNumber).padStart(2, '0')
}
