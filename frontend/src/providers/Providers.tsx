'use client'

import type { ReactNode } from 'react'

import { QueryProvider } from './QueryProvider'

interface ProvidersProps {
  children: ReactNode
}

// Combined provider tree — add ThemeProvider, ToastProvider, etc. here as phases progress
export function Providers({ children }: ProvidersProps) {
  return <QueryProvider>{children}</QueryProvider>
}
