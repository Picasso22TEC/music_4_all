'use client'

import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/api/query-keys'
import { artistApi } from '../api/artist.api'

/**
 * Detalle de artista. `enabled` debe reflejar el estado de sesión: la vista
 * /artist/[id] puede cargarse en frío por URL, y disparar la query antes de que
 * el auth store rehidrate provoca un 401 que el interceptor traduce en
 * setExpired() → cierra la sesión. El caller pasa `status === 'authenticated'`.
 */
export function useArtistDetailQuery(artistId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.artist.detail(artistId ?? ''),
    queryFn: () => artistApi.getDetail(artistId!),
    enabled: enabled && artistId !== null,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  })
}
