'use client'

import { useEffect } from 'react'

interface KeyboardShortcut {
  key: string
  /** Match Cmd (Mac) or Ctrl (Win) */
  mod?: boolean
  handler: () => void
}

export function useKeyboardShortcut(shortcut: KeyboardShortcut): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      const modMatch = shortcut.mod ? e.metaKey || e.ctrlKey : true
      if (e.key === shortcut.key && modMatch) {
        e.preventDefault()
        shortcut.handler()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [shortcut])
}
