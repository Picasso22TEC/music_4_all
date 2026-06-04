'use client'

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'

import { cn } from '@/shared/lib/cn'

// ─── Context ─────────────────────────────────────────────────────────────────

interface TabsContextValue {
  activeValue: string
  onValueChange: (v: string) => void
  variant: TabsVariant
  baseId: string
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsCtx() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tabs compound components must be used inside <Tabs>')
  return ctx
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type TabsVariant = 'underline' | 'panel'

export interface TabsProps {
  /** Uncontrolled: initial active value */
  defaultValue?: string
  /** Controlled: active value */
  value?: string
  onValueChange?: (value: string) => void
  variant?: TabsVariant
  children: React.ReactNode
  className?: string
}

export interface TabsListProps {
  children: React.ReactNode
  className?: string
  /** Accessible label for the tablist */
  'aria-label'?: string
}

export interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

export interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
}

// ─── Tabs root ────────────────────────────────────────────────────────────────

export function Tabs({
  defaultValue = '',
  value,
  onValueChange,
  variant = 'underline',
  children,
  className,
}: TabsProps) {
  const [internal, setInternal] = useState(defaultValue)
  const baseId = useId()

  const activeValue = value ?? internal
  const handleChange = useCallback(
    (v: string) => {
      setInternal(v)
      onValueChange?.(v)
    },
    [onValueChange]
  )

  // P-04: Memoize context value to prevent unnecessary re-renders of all tab consumers
  const contextValue = useMemo(
    () => ({ activeValue, onValueChange: handleChange, variant, baseId }),
    [activeValue, handleChange, variant, baseId]
  )

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

// ─── TabsList ─────────────────────────────────────────────────────────────────

export function TabsList({
  children,
  className,
  'aria-label': ariaLabel = 'Navigation tabs',
}: TabsListProps) {
  const { variant } = useTabsCtx()

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'flex',
        // underline variant: bottom separator (spec §3.9)
        variant === 'underline' && 'border-b border-subtle',
        // panel variant: gap between tabs
        variant === 'panel' && 'gap-1',
        className
      )}
    >
      {children}
    </div>
  )
}

// ─── TabsTrigger ──────────────────────────────────────────────────────────────

export function TabsTrigger({ value, children, disabled = false, className }: TabsTriggerProps) {
  const { activeValue, onValueChange, variant, baseId } = useTabsCtx()
  const isActive = activeValue === value
  const listRef = useRef<HTMLButtonElement>(null)

  // Keyboard navigation — spec §5.2: ← → to move between tabs
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const list = listRef.current?.closest('[role="tablist"]')
    if (!list) return
    const triggers = Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'))
    const idx = triggers.indexOf(listRef.current!)

    let next = idx
    if (e.key === 'ArrowRight') { e.preventDefault(); next = (idx + 1) % triggers.length }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); next = (idx - 1 + triggers.length) % triggers.length }

    if (next !== idx) triggers[next]?.focus()
  }

  return (
    <button
      ref={listRef}
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={isActive}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => !disabled && onValueChange(value)}
      onKeyDown={handleKeyDown}
      className={cn(
        'font-sans text-sm transition-colors duration-100 ease-out',
        'focus-visible:outline-none focus-visible:shadow-glow-focus rounded-sm',
        'disabled:pointer-events-none disabled:opacity-[0.38]',

        // ── Underline variant (design-system §3.9) ────────────────────────
        variant === 'underline' && [
          'px-4 py-3 relative',
          // Active: text-primary, bottom indicator
          isActive
            ? 'text-primary font-medium after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-0.5 after:bg-teal-500'
            : 'text-secondary hover:text-primary',
        ],

        // ── Panel variant (design-system §3.9) ────────────────────────────
        variant === 'panel' && [
          'px-4 py-2 rounded-md',
          isActive
            ? 'bg-surface-rack text-primary font-medium'
            : 'bg-surface-console text-secondary hover:text-primary',
        ],

        className
      )}
    >
      {children}
    </button>
  )
}

// ─── TabsContent ──────────────────────────────────────────────────────────────

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { activeValue, baseId } = useTabsCtx()
  const isActive = activeValue === value

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      hidden={!isActive}
      className={cn('focus-visible:outline-none', className)}
    >
      {isActive ? children : null}
    </div>
  )
}
