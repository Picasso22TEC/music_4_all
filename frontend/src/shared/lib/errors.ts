export type ApiErrorCode =
  | 'INVALID_URL'
  | 'NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'REGION_BLOCKED'
  | 'CONFLICT'
  | 'INVALID_TRANSITION'
  | 'DEVICE_AUTH_EXPIRED'
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
