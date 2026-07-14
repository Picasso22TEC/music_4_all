import { ArtistClient } from './ArtistClient'

/**
 * Artist page — Server Component thin shell.
 *
 * First dynamic route in the app. Delegates state/logic to ArtistClient
 * (client boundary), inheriting the authenticated (app) shell.
 */
export default function ArtistPage({ params }: { params: { id: string } }) {
  return <ArtistClient artistId={params.id} />
}
