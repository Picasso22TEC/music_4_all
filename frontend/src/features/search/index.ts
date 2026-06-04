// ── Model ─────────────────────────────────────────────────────────────────────
export { useSearchQuery, useResolveUrlQuery } from './model/search.queries'
export { isValidTidalUrl, getTidalUrlType } from './model/url-detection.utils'

// ── API ───────────────────────────────────────────────────────────────────────
export { searchApi } from './api/search.api'

// ── UI (Phase 6B.1) ───────────────────────────────────────────────────────────
export { AlbumCard } from './ui/AlbumCard'
export type { AlbumCardProps } from './ui/AlbumCard'

export { SearchInput } from './ui/SearchInput'
export type { SearchInputProps } from './ui/SearchInput'

export { SearchResults } from './ui/SearchResults'
export type { SearchResultsProps } from './ui/SearchResults'

export { EmptyState } from './ui/EmptyState'
export type { EmptyStateProps, EmptyStateVariant } from './ui/EmptyState'
