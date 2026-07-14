'use client'

import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/api/query-keys'
import { artistApi } from '../api/artist.api'

export function useArtistDetailQuery(artistId: string | null) {
  return useQuery({
    queryKey: queryKeys.artist.detail(artistId ?? ''),
    queryFn: () => artistApi.getDetail(artistId!),
    enabled: artistId !== null,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  })
}
