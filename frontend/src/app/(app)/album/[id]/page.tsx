import { AlbumClient } from './AlbumClient'

/**
 * Album page — Server Component thin shell.
 *
 * Album detail as a dedicated route (A3), replacing the dashboard modal:
 * shareable URL, browser-back, consistent with the artist page.
 */
export default function AlbumPage({ params }: { params: { id: string } }) {
  return <AlbumClient albumId={params.id} />
}
