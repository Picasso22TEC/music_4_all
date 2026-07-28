export type ApiErrorCode =
  | 'INVALID_URL'
  | 'NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  // Cuota del usuario agotada (concurrentes o diaria) — 429 con mensaje explicativo.
  | 'QUOTA_EXCEEDED'
  // Cuenta suspendida (ban) — 403 en todo endpoint autenticado y en el login.
  | 'ACCOUNT_BANNED'
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

/**
 * Copia de error en inglés y orientada al usuario, por código.
 *
 * El backend emite sus mensajes en español (su convención). Mostrarlos verbatim
 * mezclaba idiomas en una UI en inglés. Este mapa centraliza el texto que ve el
 * usuario; si el código es desconocido cae al mensaje del backend y, si tampoco,
 * a un genérico.
 */
const FRIENDLY_MESSAGES: Record<ApiErrorCode, string> = {
  INVALID_URL: 'That does not look like a valid Tidal link.',
  NOT_FOUND: 'We could not find that item.',
  SESSION_EXPIRED: 'Your session expired. Please sign in again.',
  UNAUTHORIZED: 'Please sign in to continue.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  QUOTA_EXCEEDED: 'You have reached your download limit. Please try again later.',
  ACCOUNT_BANNED: 'Your account has been suspended.',
  REGION_BLOCKED: 'This content is not available in your region.',
  CONFLICT: 'That conflicts with the current state.',
  INVALID_TRANSITION: 'That action is not allowed right now.',
  DEVICE_AUTH_EXPIRED: 'The authorization code expired. Please start again.',
  PKCE_NOT_STARTED: 'No Hi-Fi login in progress. Please start again.',
  PKCE_EXCHANGE_FAILED: 'Could not complete the Hi-Fi login. Please try again.',
  PKCE_WRONG_ACCOUNT: 'That Tidal account does not match your session.',
  SERVER_ERROR: 'Something went wrong. Please try again.',
}

export function friendlyErrorMessage(error: unknown, fallback = 'Please try again.'): string {
  if (isApiError(error)) {
    return FRIENDLY_MESSAGES[error.code] ?? error.message ?? fallback
  }
  return fallback
}
