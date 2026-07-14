'use client'

import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/api/query-keys'
import { albumApi } from '../api/album.api'

export function useAlbumDetailQuery(albumId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.album.detail(albumId ?? ''),
    queryFn: () => albumApi.getDetail(albumId!),
    // `enabled` refleja el estado de auth: /album/[id] puede cargarse en frío por
    // URL; disparar antes de rehidratar da un 401 → setExpired (cierra sesión).
    enabled: enabled && albumId !== null,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  })
}
