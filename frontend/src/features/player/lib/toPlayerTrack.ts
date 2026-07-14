import type { Track } from '@/entities'

import type { PlayerTrack } from '../model/player.store'

/**
 * Map a domain Track to a PlayerTrack that streams from Tidal (no download).
 * `src` points at the AAC streaming proxy so playback starts without waiting
 * for a download. Shared by the album detail modal and the artist page.
 */
export function trackToPlayerTrack(t: Track): PlayerTrack {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist.name,
    album: t.albumTitle,
    coverUrl: t.coverUrl || null,
    src: `/api/download/stream/${t.id}`,
  }
}
