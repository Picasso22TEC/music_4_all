import type { Metadata } from 'next'

import { LegalDocument } from '../_components/LegalDocument'

export const metadata: Metadata = {
  title: 'Disclaimer — Music 4 All',
  description: 'No affiliation with Tidal, "as is" service, and availability risks.',
}

export default function DisclaimerPage() {
  return (
    <LegalDocument title="Disclaimer" updated="2026-07-28">
      <section>
        <h2>No affiliation with Tidal</h2>
        <p>
          Music 4 All is an <strong>independent, unofficial</strong> tool. It is not affiliated
          with, authorized, endorsed, or sponsored by Tidal or its owners. &ldquo;TIDAL&rdquo; and
          related names and logos are trademarks of their respective owners, used here only to
          describe interoperability.
        </p>
      </section>

      <section>
        <h2>Your responsibility</h2>
        <p>
          You are responsible for ensuring that your use of the Service complies with
          Tidal&rsquo;s terms of service, the licenses attached to the content you access, and the
          laws of your jurisdiction. The Service only brokers access to content that your own
          Tidal subscription already entitles you to.
        </p>
      </section>

      <section>
        <h2>&ldquo;As is&rdquo;, no warranty</h2>
        <p>
          The Service is provided <strong>&ldquo;as is&rdquo;</strong> and{' '}
          <strong>&ldquo;as available&rdquo;</strong>, without warranty of any kind, express or
          implied, including merchantability, fitness for a particular purpose, and
          non-infringement. We do not warrant that the Service will be uninterrupted, timely,
          secure, or error-free, or that downloaded files will meet any particular quality.
        </p>
      </section>

      <section>
        <h2>Availability and access may change or be revoked</h2>
        <p>
          The Service depends on shared third-party credentials and systems that are outside our
          control. That access <strong>may be rate-limited, degraded, suspended, or revoked at any
          time</strong>, which could break some or all functionality without notice. We may also
          change, suspend, or discontinue the Service, in whole or in part, at any time. We are not
          liable for any resulting loss of access or data.
        </p>
      </section>

      <section>
        <h2>Personal use only</h2>
        <p>
          The Service is intended for personal, non-commercial use. Any other use is at your own
          risk and may violate these documents, Tidal&rsquo;s terms, or applicable law.
        </p>
      </section>
    </LegalDocument>
  )
}
