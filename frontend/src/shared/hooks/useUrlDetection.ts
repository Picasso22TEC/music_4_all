'use client'

import { useCallback } from 'react'

import { isValidTidalUrl } from '@/shared/lib/url.utils'

interface UseUrlDetectionCallbacks {
  onUrlDetected: (url: string) => void
  onTextInput: (text: string) => void
}

export function useUrlDetection({ onUrlDetected, onTextInput }: UseUrlDetectionCallbacks) {
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pasted = e.clipboardData.getData('text').trim()
      if (isValidTidalUrl(pasted)) {
        e.preventDefault()
        onUrlDetected(pasted)
      }
    },
    [onUrlDetected]
  )

  const handleChange = useCallback(
    (value: string) => {
      if (isValidTidalUrl(value.trim())) {
        onUrlDetected(value.trim())
      } else {
        onTextInput(value)
      }
    },
    [onUrlDetected, onTextInput]
  )

  return { handlePaste, handleChange }
}
