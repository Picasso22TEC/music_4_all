'use client'

import { useCallback } from 'react'

import { isApiError } from '@/shared/lib'
import { useToast } from '@/shared/ui'

/**
 * onError handler for the start-download mutations.
 *
 * Without it a rejected enqueue leaves the download button silently doing
 * nothing. That became reachable in normal use once per-user quotas landed:
 * going over the limit answers 429 QUOTA_EXCEEDED with an explanatory message.
 * A quota hit is a limit, not a failure, so it reads as a warning.
 */
export function useDownloadErrorToast() {
  const { toast } = useToast()

  return useCallback(
    (error: unknown) => {
      const overQuota = isApiError(error) && error.code === 'QUOTA_EXCEEDED'
      toast({
        variant: overQuota ? 'warning' : 'error',
        title: overQuota ? 'Download limit reached' : 'Could not start download',
        description: isApiError(error) ? error.message : 'Please try again.',
      })
    },
    [toast],
  )
}
