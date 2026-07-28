'use client'

import { useCallback, useRef } from 'react'
import { Lock } from 'lucide-react'

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

const EMPTY_DISABLED: readonly AudioQuality[] = []

// ─── Props ────────────────────────────────────────────────────────────────────

export interface QualitySelectorProps {
  value: AudioQuality
  onChange: (quality: AudioQuality) => void
  disabled?: boolean
  /**
   * Opciones individualmente bloqueadas (además de `disabled` global). Se usa
   * para "16-bit" (HIGH) cuando la sesión Hi-Fi no está conectada: la opción se
   * muestra con candado, no es seleccionable ni recibe foco, y la navegación por
   * teclado la salta. `lockedHint` explica el porqué (tooltip + aria).
   */
  disabledValues?: readonly AudioQuality[]
  /** Texto del tooltip/aria para las opciones bloqueadas por `disabledValues`. */
  lockedHint?: string
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Quality selector with role="radiogroup" + role="radio".
 *
 * Keyboard navigation:
 *   ArrowRight / ArrowDown  → next (enabled) option
 *   ArrowLeft  / ArrowUp   → previous (enabled) option
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
  disabledValues = EMPTY_DISABLED,
  lockedHint,
  className,
}: QualitySelectorProps) {
  const count = QUALITY_OPTIONS.length
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  const isOptionDisabled = useCallback(
    (v: AudioQuality) => disabled || disabledValues.includes(v),
    [disabled, disabledValues]
  )

  // Índice que lleva el tabIndex 0 (roving). Se prefiere la opción seleccionada;
  // si está bloqueada, se cae a la primera opción habilitada para que el grupo
  // siga siendo alcanzable con Tab (a11y).
  const selectedIndex = QUALITY_OPTIONS.findIndex((o) => o.value === value)
  const tabbableIndex =
    selectedIndex >= 0 && !isOptionDisabled(QUALITY_OPTIONS[selectedIndex].value)
      ? selectedIndex
      : QUALITY_OPTIONS.findIndex((o) => !isOptionDisabled(o.value))

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0
      if (dir === 0) return
      e.preventDefault()
      // Buscar la siguiente opción habilitada, saltando las bloqueadas.
      for (let step = 1; step <= count; step++) {
        const next = (index + dir * step + count * count) % count
        if (!isOptionDisabled(QUALITY_OPTIONS[next].value)) {
          onChange(QUALITY_OPTIONS[next].value)
          itemRefs.current[next]?.focus()
          return
        }
      }
    },
    [onChange, count, isOptionDisabled]
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
        const locked = !disabled && disabledValues.includes(option.value)
        const optionDisabled = isOptionDisabled(option.value)

        return (
          <button
            key={option.value}
            ref={(el) => { itemRefs.current[index] = el }}
            role="radio"
            aria-checked={isSelected}
            aria-label={locked && lockedHint ? `${option.label}. ${lockedHint}` : option.label}
            title={locked ? lockedHint : undefined}
            type="button"
            disabled={optionDisabled}
            // Roving tabIndex: only the tabbable item is in the tab order
            tabIndex={index === tabbableIndex ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              'inline-flex items-center gap-1 rounded-sm px-2 py-1 font-mono text-2xs font-medium uppercase',
              'transition-all duration-100 ease-out',
              'focus-visible:outline-none focus-visible:shadow-glow-focus',
              'disabled:pointer-events-none disabled:opacity-[0.38]',
              // Selected → quality badge style (design-system §3.6)
              isSelected
                ? 'border border-teal-500 bg-teal-500/15 text-teal-400'
                : 'border text-secondary hover:border-teal-500 hover:text-teal-400',
            )}
          >
            {locked && <Lock aria-hidden="true" className="h-3 w-3" />}
            {option.shortLabel}
          </button>
        )
      })}
    </div>
  )
}
