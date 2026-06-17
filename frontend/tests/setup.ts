import * as matchers from '@testing-library/jest-dom/matchers'
import { expect, vi } from 'vitest'

// Extend Vitest's expect with @testing-library/jest-dom matchers
// (toBeVisible, toHaveTextContent, etc.) for future component tests.
expect.extend(matchers)

// ── next/navigation — used by any component that calls useRouter / usePathname ─
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

// ── next/image — returns null so tests don't need Next.js image internals ──
vi.mock('next/image', () => ({
  default: vi.fn().mockReturnValue(null),
}))
