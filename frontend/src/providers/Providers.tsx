'use client'

import type { ReactNode } from 'react'

import { ToastProvider } from '@/shared/ui/Toast'
import { QueryProvider } from './QueryProvider'

interface ProvidersProps {
  children: ReactNode
}

// Combined provider tree — Phase 4 adds ToastProvider for notification system
export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </QueryProvider>
  )
}
