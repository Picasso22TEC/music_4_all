'use client'

import { useCallback, useRef } from 'react'

import { cn } from '@/shared/lib/cn'
import type { AudioQuality } from '@/entities'

// ─── Quality options (Technical Spec §1.4 — valid quality values) ─────────────

type QualityOption = {
  readonly value: AudioQuality
  /** Short label shown in the button — max 8 chars (badge constraint) */
  readonly shortLabel: string
  /** Full accessible name for aria-label */
  readonly label: string
}

const QUALITY_OPTIONS: ReadonlyArray<QualityOption> = [
  { value: 'MASTER', shortLabel: 'MASTER',  label: 'Master Quality — MQA or Hi-Res, best available' },
  { value: 'HIRES',  shortLabel: 'HI-RES',  label: 'Hi-Res 24-bit FLAC' },
  { value: 'HIGH',   shortLabel: 'FLAC',    label: 'High Quality — 16-bit FLAC, CD quality' },
  { value: 'NORMAL', shortLabel: 'AAC',     label: 'Normal Quality — AAC 320 kbps' },
] as const

// ─── Props ────────────────────────────────────────────────────────────────────

export interface QualitySelectorProps {
  value: AudioQuality
  onChange: (quality: AudioQuality) => void
  disabled?: boolean
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Quality selector with role="radiogroup" + role="radio".
 *
 * Keyboard navigation:
 *   ArrowRight / ArrowDown  → next option
 *   ArrowLeft  / ArrowUp   → previous option
 *
 * Compatible with React Hook Form via Controller:
 *   <Controller render={({ field: { value, onChange } }) =>
 *     <QualitySelector value={value} onChange={onChange} />
 *   } />
 */
export function QualitySelector({
  value,
  onChange,
  disabled = false,
  className,
}: QualitySelectorProps) {
  const count = QUALITY_OPTIONS.length
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      let next = -1
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        next = (index + 1) % count
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        next = (index - 1 + count) % count
      }
      if (next >= 0) {
        onChange(QUALITY_OPTIONS[next].value)
        itemRefs.current[next]?.focus()
      }
    },
    [onChange, count]
  )

  return (
    <div
      role="radiogroup"
      aria-label="Select download quality"
      aria-disabled={disabled || undefined}
      className={cn('flex flex-wrap gap-1', className)}
    >
      {QUALITY_OPTIONS.map((option, index) => {
        const isSelected = value === option.value

        return (
          <button
            key={option.value}
            ref={(el) => { itemRefs.current[index] = el }}
            role="radio"
            aria-checked={isSelected}
            aria-label={option.label}
            type="button"
            disabled={disabled}
            // Roving tabIndex: only the selected item is in the tab order
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              'rounded-sm px-2 py-1 font-mono text-2xs font-medium uppercase',
              'transition-all duration-100 ease-out',
              'focus-visible:outline-none focus-visible:shadow-glow-focus',
              'disabled:pointer-events-none disabled:opacity-[0.38]',
              // Selected → quality badge style (design-system §3.6)
              isSelected
                ? 'border border-teal-500 bg-teal-500/15 text-teal-400'
                : 'border text-secondary hover:border-teal-500 hover:text-teal-400',
            )}
          >
            {option.shortLabel}
          </button>
        )
      })}
    </div>
  )
}
