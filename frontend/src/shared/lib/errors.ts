export type ApiErrorCode =
  | 'INVALID_URL'
  | 'NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  // Cuota del usuario agotada (concurrentes o diaria) — 429 con mensaje explicativo.
  | 'QUOTA_EXCEEDED'
  | 'REGION_BLOCKED'
  | 'CONFLICT'
  | 'INVALID_TRANSITION'
  | 'DEVICE_AUTH_EXPIRED'
  // Conexión Hi-Fi (PKCE 16-bit): flujo no iniciado/expirado, canje fallido, o
  // la cuenta logueada no coincide con la sesión.
  | 'PKCE_NOT_STARTED'
  | 'PKCE_EXCHANGE_FAILED'
  | 'PKCE_WRONG_ACCOUNT'
  | 'SERVER_ERROR'

export interface ApiError {
  readonly code: ApiErrorCode
  readonly message: string
  readonly httpStatus: number
  readonly retriable: boolean
  readonly existingJobId?: string
}

export function isApiError(e: unknown): e is ApiError {
  return typeof e === 'object' && e !== null && 'code' in e && 'httpStatus' in e
}
