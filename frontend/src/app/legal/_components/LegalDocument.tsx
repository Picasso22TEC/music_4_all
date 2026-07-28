import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

/**
 * Presentational shell for a legal document (Server Component).
 *
 * Renders a prominent "template" banner on top of every legal page: the content
 * shipped in this repo is a **starting template**, not vetted legal advice. It must
 * be reviewed with counsel and have its [placeholders] filled before a public launch.
 */
export function LegalDocument({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: ReactNode
}) {
  return (
    <article className="mx-auto w-full max-w-3xl">
      <div
        role="note"
        className="mb-8 flex items-start gap-3 rounded-md border border-semantic-warning bg-semantic-warning/10 px-4 py-3"
      >
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-semantic-warning" />
        <p className="font-sans text-sm text-secondary">
          <span className="font-semibold text-semantic-warning">Template — not legal advice.</span>{' '}
          Review this document with legal counsel and replace every{' '}
          <code className="rounded bg-surface-console px-1 font-mono text-2xs">[placeholder]</code>{' '}
          before publishing.
        </p>
      </div>

      <header className="mb-8 border-b border-subtle pb-6">
        <h1 className="font-sans text-3xl font-bold text-primary">{title}</h1>
        <p className="mt-2 font-mono text-2xs uppercase tracking-wider text-secondary">
          Last updated: {updated}
        </p>
      </header>

      {/* Prose: los <section>/<h2>/<p>/<ul> se estilan con las utilidades de abajo. */}
      <div className="space-y-8 font-sans text-sm leading-relaxed text-secondary [&_a]:text-teal-400 [&_a]:underline [&_h2]:mb-2 [&_h2]:font-sans [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-primary [&_li]:ml-1 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
        {children}
      </div>
    </article>
  )
}
