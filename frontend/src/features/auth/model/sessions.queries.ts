'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/api/query-keys'
import { authApi } from '../api/auth.api'
import { selectIsAuthenticated, useAuthStore } from './auth.store'

/**
 * Sesiones de app activas del usuario (panel de dispositivos).
 *
 * Gated por auth: el endpoint exige sesión y, sin ella, un 401 dispararía el
 * logout global (ver shared/api/client). TTL corto — el panel se abre puntualmente
 * en Ajustes.
 */
export function useSessionsQuery() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  return useQuery({
    queryKey: queryKeys.session.list(),
    queryFn: authApi.listSessions,
    enabled: isAuthenticated,
    staleTime: 10_000,
  })
}

/** Cierra una sesión concreta (otro dispositivo) y refresca la lista. */
export function useRevokeSessionMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sid: string) => authApi.revokeSession(sid),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.session.list() }),
  })
}

/** Cierra todas las demás sesiones (conserva la actual) y refresca la lista. */
export function useRevokeOtherSessionsMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: authApi.revokeOtherSessions,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.session.list() }),
  })
}
