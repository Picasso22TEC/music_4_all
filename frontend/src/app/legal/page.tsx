import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText, Copyright, ShieldAlert } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Legal — Music 4 All',
  description: 'Terms of Service, Copyright & DMCA policy, and Disclaimer.',
}

const DOCS = [
  {
    href: '/legal/terms',
    title: 'Terms of Service',
    desc: 'The rules for using Music 4 All, acceptable use, quotas, and account suspension.',
    Icon: FileText,
  },
  {
    href: '/legal/copyright',
    title: 'Copyright & DMCA',
    desc: 'Copyright policy, how to file a takedown notice, and the repeat-infringer policy.',
    Icon: Copyright,
  },
  {
    href: '/legal/disclaimer',
    title: 'Disclaimer',
    desc: 'No affiliation with Tidal, "as is" service, and availability risks.',
    Icon: ShieldAlert,
  },
]

export default function LegalIndexPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="font-sans text-3xl font-bold text-primary">Legal</h1>
      <p className="mt-2 font-sans text-sm text-secondary">
        Please review these documents. By using Music 4 All you agree to them.
      </p>

      <ul className="mt-8 grid gap-4">
        {DOCS.map(({ href, title, desc, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-start gap-4 rounded-lg border border-subtle bg-surface-console/60 p-5 transition-colors hover:border-teal-400/60 focus-visible:outline-none focus-visible:shadow-glow-focus"
            >
              <Icon aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-teal-400" />
              <div>
                <h2 className="font-sans text-base font-semibold text-primary">{title}</h2>
                <p className="mt-1 font-sans text-sm text-secondary">{desc}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
