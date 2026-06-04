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

// Polling query — active while deviceCode is non-null, stops on terminal status
export function useDeviceAuthPollingQuery(deviceCode: string | null) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: queryKeys.session.deviceAuth(deviceCode ?? ''),
    queryFn: () => authApi.pollDeviceAuth(deviceCode!),
    enabled: deviceCode !== null,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchInterval: (query) => {
      const data = query.state.data
      if (
        data?.status === 'authorized' ||
        data?.status === 'expired' ||
        data?.status === 'denied'
      ) {
        return false
      }
      return 5_000
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
