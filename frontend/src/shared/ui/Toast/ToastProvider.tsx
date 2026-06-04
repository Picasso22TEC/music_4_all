'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'framer-motion'

import { Toast, type ToastVariant } from './Toast'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ToastConfig {
  variant: ToastVariant
  title: string
  description?: string
  duration?: number
}

interface ToastItem extends ToastConfig {
  id: string
}

interface ToastContextValue {
  toast:       (config: ToastConfig) => string
  dismiss:     (id: string) => void
  dismissAll:  () => void
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

// ─── Convenience helpers (attached to useToast) ───────────────────────────────

// Usage: const { toast } = useToast(); toast.success('Done!')
// The returned toast fn also has .success(), .error(), .warning(), .info() shortcuts.

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  // NX-01: use mounted pattern instead of typeof document check to
  // avoid Next.js 14 SSR hydration mismatches
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const toast = useCallback((config: ToastConfig): string => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { ...config, id }])
    return id
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const dismissAll = useCallback(() => setToasts([]), [])

  return (
    <ToastContext.Provider value={{ toast, dismiss, dismissAll }}>
      {children}

      {/* Toast stack — spec §3.5: bottom-right, z-toast:500 */}
      {mounted &&
        createPortal(
          <div
            aria-live="polite"
            aria-label="Notifications"
            className="fixed bottom-4 right-4 z-toast flex flex-col gap-2 pointer-events-none"
          >
            <AnimatePresence mode="sync">
              {toasts.map((t) => (
                <div key={t.id} className="pointer-events-auto">
                  <Toast
                    id={t.id}
                    variant={t.variant}
                    title={t.title}
                    description={t.description}
                    duration={t.duration}
                    onClose={dismiss}
                  />
                </div>
              ))}
            </AnimatePresence>
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  )
}
