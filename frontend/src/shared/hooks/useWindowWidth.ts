'use client'

import { useEffect, useState } from 'react'

export function useWindowWidth(): number {
  const [width, setWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1440
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return width
}

// Responsive breakpoints per frontend-implementation-spec §8.1
export function useDetailPanelVariant(): 'drawer' | 'sheet' {
  const width = useWindowWidth()
  return width >= 1024 ? 'drawer' : 'sheet'
}
