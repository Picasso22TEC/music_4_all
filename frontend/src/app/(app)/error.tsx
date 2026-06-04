'use client'

// Error boundary for the authenticated (app) route group
// from frontend-implementation-spec §9

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <p className="font-mono text-sm">Unexpected error</p>
        <p className="mt-2 font-mono text-xs opacity-50">{error.message}</p>
        <button onClick={reset} className="mt-4 font-mono text-sm underline">
          Try again
        </button>
      </div>
    </div>
  )
}
