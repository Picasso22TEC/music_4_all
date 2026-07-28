import type { ReactNode } from 'react'
import Link from 'next/link'

/**
 * Public layout for the legal pages (`/legal/*`).
 *
 * These routes are intentionally NOT under the `(app)` group, so the middleware
 * does not gate them behind a session — Terms / Copyright / Disclaimer must be
 * reachable by anyone, including before signing in.
 */
const LEGAL_LINKS = [
  { href: '/legal/terms', label: 'Terms of Service' },
  { href: '/legal/copyright', label: 'Copyright & DMCA' },
  { href: '/legal/disclaimer', label: 'Disclaimer' },
]

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-abyss text-primary">
      <header className="border-b border-subtle">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
          <Link
            href="/legal"
            className="font-mono text-sm font-semibold tracking-wider text-primary hover:text-teal-400"
          >
            MUSIC 4 ALL
          </Link>
          <Link
            href="/dashboard"
            className="font-sans text-sm text-secondary underline hover:text-teal-400 focus-visible:outline-none focus-visible:shadow-glow-focus"
          >
            Back to app
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">{children}</main>

      <footer className="border-t border-subtle">
        <nav
          aria-label="Legal documents"
          className="mx-auto flex w-full max-w-3xl flex-wrap gap-x-6 gap-y-2 px-6 py-6"
        >
          {LEGAL_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-sans text-xs text-secondary underline hover:text-teal-400 focus-visible:outline-none focus-visible:shadow-glow-focus"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </footer>
    </div>
  )
}
