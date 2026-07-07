'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'

import { cn } from '@/shared/lib/cn'
import { useFocusTrap } from '@/shared/hooks/useFocusTrap'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ModalSize = 'sm' | 'md' | 'lg' | 'full'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  /** Modal title — rendered in header and wired to aria-labelledby */
  title?: string
  /**
   * Accessible name when no visible title is rendered.
   * Either `title` or `aria-label` must be provided (WCAG 4.1.2).
   */
  'aria-label'?: string
  size?: ModalSize
  children: React.ReactNode
  className?: string
}

// ─── Style maps (design-system §3.4) ─────────────────────────────────────────

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm:   'w-full max-w-[400px]',
  md:   'w-full max-w-[560px]',
  lg:   'w-full max-w-[720px]',
  full: 'w-[90vw]',
}

// ─── Framer Motion variants ───────────────────────────────────────────────────

const backdropV = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
}

const panelV = {
  hidden:  { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1,   transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, scale: 0.96, transition: { duration: 0.15, ease: 'easeIn' } },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Modal({
  isOpen,
  onClose,
  title,
  'aria-label': ariaLabel,
  size = 'md',
  children,
  className,
}: ModalProps) {
  // A-01: dev warning when neither title nor aria-label is provided
  if (process.env.NODE_ENV !== 'production' && !title && !ariaLabel) {
    console.warn(
      '[Modal] Provide either "title" or "aria-label" for accessible dialog naming (WCAG 4.1.2).'
    )
  }

  const [mounted, setMounted] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  // Defer portal to client
  useEffect(() => setMounted(true), [])

  // Escape key close (spec §3.4 + §5.2)
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Scroll lock (spec §3.4 behavior)
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Return focus to trigger on close (spec §5.3)
  useEffect(() => {
    if (!isOpen) return
    const prev = document.activeElement as HTMLElement
    return () => { prev?.focus() }
  }, [isOpen])

  // Focus trap
  useFocusTrap(panelRef, isOpen)

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — spec: rgba(8,11,15,0.80) = bg-surface-void/80 */}
          <motion.div
            key="backdrop"
            variants={backdropV}
            initial="hidden"
            animate="visible"
            exit="exit"
            aria-hidden="true"
            onClick={onClose}
            className="fixed inset-0 z-overlay bg-surface-void/80"
          />

          {/* Modal panel */}
          <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
            <motion.div
              key="panel"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              aria-label={!title ? ariaLabel : undefined}
              variants={panelV}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className={cn(
                // Surface + border (spec §3.4)
                'bg-surface-studio border rounded-lg shadow-xl',
                'max-h-[90vh] overflow-y-auto',
                'focus:outline-none',
                SIZE_CLASSES[size],
                className
              )}
            >
              {/* Header */}
              {title && (
                <div className="flex items-center justify-between border-b border-subtle px-6 py-4">
                  <h2
                    id={titleId}
                    className="font-sans text-heading font-semibold text-primary"
                  >
                    {title}
                  </h2>
                  <button
                    onClick={onClose}
                    aria-label="Close modal"
                    className={cn(
                      'text-secondary hover:text-primary',
                      'transition-colors duration-100',
                      'focus-visible:outline-none focus-visible:shadow-glow-focus rounded-sm',
                    )}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              )}

              {/* Body */}
              <div className="p-6">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
