export const queryKeys = {
  search: {
    all: () => ['search'] as const,
    results: (query: string) => ['search', 'results', query] as const,
  },
  url: {
    all: () => ['url'] as const,
    resolve: (url: string) => ['url', 'resolve', url] as const,
  },
  album: {
    all: () => ['album'] as const,
    detail: (albumId: string) => ['album', 'detail', albumId] as const,
  },
  artist: {
    all: () => ['artist'] as const,
    detail: (artistId: string) => ['artist', 'detail', artistId] as const,
  },
  session: {
    all: () => ['session'] as const,
    status: () => ['session', 'status'] as const,
    deviceAuth: (deviceCode: string) => ['session', 'device-auth', deviceCode] as const,
    pkceStatus: () => ['session', 'pkce', 'status'] as const,
    list: () => ['session', 'list'] as const,
  },
} as const

export type QueryKey = ReturnType<
  | typeof queryKeys.search.results
  | typeof queryKeys.url.resolve
  | typeof queryKeys.album.detail
  | typeof queryKeys.artist.detail
  | typeof queryKeys.session.status
  | typeof queryKeys.session.deviceAuth
  | typeof queryKeys.session.pkceStatus
  | typeof queryKeys.session.list
>
