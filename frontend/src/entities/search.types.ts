import type { Album } from './album'
import type { Track } from './track'
import type { Playlist } from './playlist'

export interface PaginatedList<T> {
  readonly items: readonly T[]
  readonly totalNumberOfItems: number
  readonly limit: number
  readonly offset: number
}

/** An artist as a search result — carries an image to render the card. */
export interface ArtistResult {
  readonly id: string
  readonly name: string
  readonly imageUrl: string | null
}

export interface SearchResults {
  readonly artists: PaginatedList<ArtistResult>
  readonly albums: PaginatedList<Album>
  readonly tracks: PaginatedList<Track>
  readonly playlists: PaginatedList<Playlist>
}

export interface ResolveUrlResult {
  readonly type: 'album' | 'track' | 'playlist'
  readonly id: string
  readonly data: Album | Track | Playlist
}
