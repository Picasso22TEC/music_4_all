'use client'

import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/api/query-keys'
import { albumApi } from '../api/album.api'

export function useAlbumDetailQuery(albumId: string | null) {
  return useQuery({
    queryKey: queryKeys.album.detail(albumId ?? ''),
    queryFn: () => albumApi.getDetail(albumId!),
    enabled: albumId !== null,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  })
}
