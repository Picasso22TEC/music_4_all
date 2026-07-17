import axios, { type AxiosError } from 'axios'

import { type ApiError, type ApiErrorCode } from '@/shared/lib/errors'
import { API_BASE_URL, API_TIMEOUT_MS } from '@/shared/config/api.config'

/**
 * Marca una petición como automática (no la pidió el usuario).
 *
 * El backend no renueva con ellas el TTL de inactividad de la sesión: si el
 * auto-refresco contara como actividad, dejar una pestaña abierta mantendría la
 * sesión viva indefinidamente y el timeout de inactividad no se cumpliría nunca.
 * Quien reporta la actividad real es el vigilante (features/auth useIdleTimeout).
 */
export const BACKGROUND_REQUEST_HEADERS = { 'X-Background-Request': '1' } as const

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Parse backend {"error": {...}} format (snake_case) into frontend ApiError (camelCase)
function parseApiError(data: unknown): ApiError | null {
  if (!data || typeof data !== 'object') return null
  const raw = (data as Record<string, unknown>).error
  if (!raw || typeof raw !== 'object') return null
  const err = raw as Record<string, unknown>

  const code = String(err.code ?? '')
  const message = String(err.message ?? 'Error')
  // Backend uses http_status (snake_case); frontend domain uses httpStatus (camelCase)
  const httpStatus = Number(err.http_status ?? err.httpStatus ?? 500)
  const retriable = Boolean(err.retriable ?? false)
  const existingJobId = err.existing_job_id ? String(err.existing_job_id) : undefined

  if (!code || !httpStatus) return null

  return {
    code: code as ApiErrorCode,
    message,
    httpStatus,
    retriable,
    ...(existingJobId !== undefined && { existingJobId }),
  }
}

/**
 * Deshace una sesión que el servidor ya no reconoce.
 *
 * Además de marcar el estado, hay que **borrar la cookie**: el middleware solo ve
 * si `m4a_sid` existe, no si sigue viva, así que una cookie obsoleta le hace creer
 * que hay sesión y devuelve al usuario al dashboard cada vez que la app intenta
 * llevarlo a /login — quedaba atrapado, sin más salida que borrarla a mano.
 * `/session/logout` no exige sesión válida, así que sirve para limpiar.
 */
let clearingRejectedSession = false

async function clearRejectedSession() {
  const { useAuthStore } = await import('@/features/auth/model/auth.store')
  useAuthStore.getState().setExpired('rejected')

  if (clearingRejectedSession) return
  clearingRejectedSession = true
  try {
    await client.post('/session/logout')
  } catch {
    // Best-effort: si no se puede limpiar, el estado local ya quedó marcado.
  } finally {
    clearingRejectedSession = false
  }
}

client.interceptors.response.use(
  (response) => response,
  async (axiosError: AxiosError) => {
    const apiError = parseApiError(axiosError.response?.data)

    if (apiError) {
      const isAuthError =
        apiError.httpStatus === 401 ||
        (apiError.httpStatus === 403 && apiError.code === 'SESSION_EXPIRED')

      // Dynamic import avoids SSR issues with Zustand localStorage persist
      // El logout no debe bloquear la respuesta al llamante: se lanza en paralelo.
      if (isAuthError && typeof window !== 'undefined') {
        void clearRejectedSession()
      }

      return Promise.reject(apiError)
    }

    // Fallback for network/CORS/non-spec errors
    const fallback: ApiError = {
      code: 'SERVER_ERROR',
      message: axiosError.message || 'Network error',
      httpStatus: axiosError.response?.status ?? 500,
      retriable: true,
    }
    return Promise.reject(fallback)
  }
)

export default client
export { client }
