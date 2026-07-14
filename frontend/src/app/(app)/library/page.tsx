import { LibraryClient } from './LibraryClient'

/**
 * Library page — Server Component thin shell.
 *
 * Delegates state/logic to LibraryClient (client boundary). The library is the
 * user's real downloaded collection, derived from the download history
 * (GET /history) grouped into albums — no dedicated backend endpoint needed.
 */
export default function LibraryPage() {
  return <LibraryClient />
}
