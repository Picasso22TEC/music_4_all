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

/**
 * The single best match for a query (Tidal/Spotify "Top result"). A discriminated
 * union on `type`, so the card renders the right entity with full type safety.
 */
export type TopHit =
  | { readonly type: 'artist'; readonly artist: ArtistResult }
  | { readonly type: 'album'; readonly album: Album }
  | { readonly type: 'track'; readonly track: Track }
  | { readonly type: 'playlist'; readonly playlist: Playlist }

export interface SearchResults {
  /** Best match, shown first as a prominent card. Null when Tidal returns none. */
  readonly topHit: TopHit | null
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
