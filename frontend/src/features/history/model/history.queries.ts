'use client'

import { useQuery } from '@tanstack/react-query'

import { historyApi } from '../api/history.api'

// ─── Query key ────────────────────────────────────────────────────────────────
// Scoped to the history feature — no cross-feature invalidation needed yet.

const historyKeys = {
  all:  () => ['history'] as const,
  list: (limit: number) => ['history', 'list', limit] as const,
}

// ─── Query hook ───────────────────────────────────────────────────────────────

/**
 * Fetches the download history list.
 *
 * Polls every 30 seconds to surface newly completed downloads
 * (matches legacy behavior, reduced from 10s for efficiency).
 */
export function useHistoryQuery(limit = 100) {
  return useQuery({
    queryKey:             historyKeys.list(limit),
    queryFn:              () => historyApi.getHistory(limit),
    staleTime:            30_000,      // 30 s — history is stable between polls
    gcTime:               5 * 60_000,  // 5 min in cache after unmount
    refetchInterval:      30_000,      // auto-refresh: surface new downloads
    refetchIntervalInBackground: false,
  })
}
