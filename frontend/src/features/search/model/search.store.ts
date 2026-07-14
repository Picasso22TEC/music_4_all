import { create } from 'zustand'

// ─── Store ────────────────────────────────────────────────────────────────────

/**
 * Global search query — shared between the AppHeader search bar (the single
 * app-wide entry point) and the dashboard results. Kept in a store (not local
 * state nor the URL) so the query survives client navigation between routes:
 * typing in the header while on /artist/[id] keeps its value once the header
 * pushes the user to /dashboard. Transient by design — not persisted.
 */
interface SearchState {
  query: string
  setQuery: (query: string) => void
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  setQuery: (query) => set({ query }),
}))
