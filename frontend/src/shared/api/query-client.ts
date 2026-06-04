import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/shared/lib/errors'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        gcTime: 5 * 60 * 1000,
        retry: (failureCount, error) => {
          if (!isApiError(error)) return failureCount < 2
          if ([400, 401, 403, 404, 409, 451].includes(error.httpStatus)) return false
          return failureCount < 2
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  })
}
