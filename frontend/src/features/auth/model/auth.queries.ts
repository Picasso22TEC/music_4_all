'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/api/query-keys'
import { authApi } from '../api/auth.api'
import { useAuthStore } from './auth.store'

// Manual query — activate with .refetch() inside SessionRecoveryModal
export function useSessionStatusQuery() {
  return useQuery({
    queryKey: queryKeys.session.status(),
    queryFn: authApi.checkStatus,
    enabled: false,   // activated manually, never on mount
    staleTime: 0,
    gcTime: 0,
    retry: 0,
  })
}

// Mutation — starts Device Auth flow and stores the code in auth.store
export function useInitDeviceAuthMutation() {
  return useMutation({
    mutationFn: authApi.initDeviceAuth,
    onSuccess: (data) => {
      useAuthStore.getState().setDeviceAuth(data)
    },
  })
}

// Polling query — active while deviceCode is non-null, stops on terminal status.
// intervalMs comes from DeviceAuthCode.interval * 1000 (backend-specified cadence).
// NEVER hardcode the polling interval — always pass it from deviceAuth.interval.
export function useDeviceAuthPollingQuery(
  deviceCode: string | null,
  /** Polling cadence in ms. Must be derived from deviceAuth.interval * 1000. */
  intervalMs = 5_000
) {
  return useQuery({
    queryKey: queryKeys.session.deviceAuth(deviceCode ?? ''),
    queryFn: () => authApi.pollDeviceAuth(deviceCode!),
    enabled: deviceCode !== null,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchInterval: (query) => {
      // Stop on any error — the backend returns HTTP 400 (DEVICE_AUTH_EXPIRED)
      // for expired/denied, which surfaces as query error, NOT as data. Per
      // TanStack Query semantics, a failed refetch keeps the last successful
      // `data` (the prior 'pending') and refetchInterval keeps firing unless it
      // returns false — so this guard is what actually halts polling on 400.
      if (query.state.status === 'error') return false
      // Terminal success: authorization completed.
      if (query.state.data?.status === 'authorized') return false
      return intervalMs  // respects backend-provided interval
    },
    refetchIntervalInBackground: false,
  })
}

export function useLogoutMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      useAuthStore.getState().clearSession()
      queryClient.invalidateQueries({ queryKey: queryKeys.session.all() })
    },
  })
}
