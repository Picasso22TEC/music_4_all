'use client'

import { useCallback } from 'react'
import { Search } from 'lucide-react'

import { cn } from '@/shared/lib/cn'
import { Input } from '@/shared/ui/Input'
import { isValidTidalUrl } from '@/shared/lib/url.utils'

// ─── Input mode (visual state) ────────────────────────────────────────────────

type InputMode = 'idle' | 'text-search' | 'url-search'

function resolveMode(value: string): InputMode {
  if (!value.trim()) return 'idle'
  return isValidTidalUrl(value.trim()) ? 'url-search' : 'text-search'
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Unified search/URL input.
 *
 * Automatically detects:
 *   - text-search: free-text query
 *   - url-search:  valid Tidal URL (via isValidTidalUrl from url-detection.utils)
 *
 * Visual state changes (trailing indicator):
 *   - idle:        no indicator
 *   - text-search: ⌘K keyboard hint
 *   - url-search:  "URL" badge in teal
 *
 * On paste: detects a Tidal URL and calls onChange with the URL directly.
 */
export function SearchInput({
  value,
  onChange,
  disabled = false,
  placeholder = 'Paste a Tidal URL or search albums and tracks…',
}: SearchInputProps) {
  const mode = resolveMode(value)

  // Detect URL on paste and inject directly into value
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pasted = e.clipboardData.getData('text').trim()
      if (isValidTidalUrl(pasted)) {
        e.preventDefault()
        onChange(pasted)
      }
      // Non-URL pastes proceed normally (browser handles insertion)
    },
    [onChange]
  )

  // Trailing indicator based on detected mode
  const trailingIcon =
    mode === 'url-search' ? (
      <span
        className="font-mono text-2xs font-medium uppercase text-teal-500"
        aria-label="Tidal URL detected"
      >
        URL
      </span>
    ) : mode === 'text-search' ? (
      <kbd
        className="rounded bg-surface-rack px-1 font-mono text-2xs text-secondary"
        aria-label="Press Enter to search"
      >
        ↵
      </kbd>
    ) : null

  return (
    <Input
      variant="default"
      size="md"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onPaste={handlePaste}
      disabled={disabled}
      placeholder={placeholder}
      aria-label="Search albums, tracks, or paste a Tidal URL"
      aria-description={
        mode === 'url-search'
          ? 'Tidal URL detected — press Enter to resolve'
          : 'Type to search or paste a Tidal URL'
      }
      leadingIcon={
        <Search
          size={14}
          aria-hidden="true"
          className={cn(
            'transition-colors duration-100',
            mode === 'url-search' ? 'text-teal-500' : 'text-secondary',
          )}
        />
      }
      trailingIcon={trailingIcon}
      className={cn(
        mode === 'url-search' && 'border-teal-500',
      )}
    />
  )
}
