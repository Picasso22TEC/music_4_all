'use client'

import { Card } from '@/shared/ui'

export default function LibraryPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-sans text-2xl font-bold text-primary">Library</h1>
        <p className="mt-1 font-sans text-sm text-secondary">
          Your downloaded music collection
        </p>
      </div>

      <Card className="flex flex-col items-center gap-4 py-16 text-center">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-secondary opacity-40"
          aria-hidden="true"
        >
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        <p className="font-sans text-base font-medium text-primary">
          Your library is empty
        </p>
        <p className="max-w-sm font-sans text-sm text-secondary">
          Your downloaded music will appear here. Download your first album to get started!
        </p>
      </Card>
    </div>
  )
}
