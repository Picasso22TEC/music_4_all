'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/api/query-keys'
import { isValidTidalUrl } from '@/shared/lib/url.utils'
import { searchApi } from '../api/search.api'

export function useSearchQuery(query: string) {
  return useQuery({
    queryKey: queryKeys.search.results(query),
    queryFn: () => searchApi.search(query),
    enabled: query.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  })
}

export function useResolveUrlQuery(url: string | null) {
  return useQuery({
    queryKey: queryKeys.url.resolve(url ?? ''),
    queryFn: () => searchApi.resolveUrl(url!),
    enabled: url !== null && isValidTidalUrl(url),
    staleTime: 15 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
  })
}
