'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/api/query-keys'
import type { AudioQuality } from '@/entities'
import { authApi } from '../api/auth.api'
import { selectIsAuthenticated, useAuthStore } from './auth.store'

/** Calidades que exigen la sesión Hi-Fi conectada (solo el 16-bit LOSSLESS). */
const HIFI_LOCKED_QUALITIES: readonly AudioQuality[] = ['HIGH']
const NO_LOCKED_QUALITIES: readonly AudioQuality[] = []

/** Tooltip/aria de la opción "16-bit" cuando la Hi-Fi no está conectada. */
export const HIFI_LOCKED_HINT = 'Connect Hi-Fi in Settings to download 16-bit.'

/**
 * Estado de la conexión Hi-Fi (16-bit) del usuario.
 *
 * Solo se consulta cuando hay sesión: el endpoint exige auth y, sin sesión, un
 * 401 dispararía el logout global (ver shared/api/client). El TTL evita repetir
 * la llamada en cada página que la use (dashboard, álbum, ajustes comparten la
 * misma clave de caché).
 */
export function usePkceStatusQuery() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  return useQuery({
    queryKey: queryKeys.session.pkceStatus(),
    queryFn: authApi.pkceStatus,
    enabled: isAuthenticated,
    staleTime: 30_000,
  })
}

/** Azúcar para gatear el selector de calidad: ¿está conectada la Hi-Fi 16-bit? */
export function useHiFiConnected(): boolean {
  return usePkceStatusQuery().data === true
}

/**
 * Calidades a bloquear en el `QualitySelector` según el estado Hi-Fi. Devuelve
 * referencias estables (mismas constantes) para no romper memoización aguas abajo.
 */
export function useLockedDownloadQualities(): readonly AudioQuality[] {
  return useHiFiConnected() ? NO_LOCKED_QUALITIES : HIFI_LOCKED_QUALITIES
}

/** Inicia el login PKCE; el llamante abre la `login_url` devuelta. */
export function usePkceStartMutation() {
  return useMutation({ mutationFn: authApi.pkceStart })
}

/** Completa la conexión con la URL "Oops" pegada; refresca el estado cacheado. */
export function usePkceCompleteMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (redirectUrl: string) => authApi.pkceComplete(redirectUrl),
    onSuccess: (connected) => {
      queryClient.setQueryData(queryKeys.session.pkceStatus(), connected)
    },
  })
}

/** Desconecta la Hi-Fi; refresca el estado cacheado a desconectado. */
export function usePkceDisconnectMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authApi.pkceDisconnect,
    onSuccess: (connected) => {
      queryClient.setQueryData(queryKeys.session.pkceStatus(), connected)
    },
  })
}
