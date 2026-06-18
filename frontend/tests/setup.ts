import { createElement, forwardRef } from 'react'

import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import { afterEach, expect, vi } from 'vitest'

// Extend Vitest's expect with @testing-library/jest-dom matchers
// (toBeVisible, toHaveTextContent, etc.) for future component tests.
expect.extend(matchers)

// Unmount + remove rendered components from jsdom after every test.
// Without this, render() calls across tests pile up in the same document,
// breaking single-element queries (getByRole/getByText) on shared markup.
afterEach(cleanup)

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

// ── framer-motion — jsdom has no rAF/animation loop, so motion.* elements would
// stay frozen at their `initial` style (e.g. opacity: 0), failing toBeVisible().
// Strip animation-only props and render plain DOM elements instead.
const MOTION_ONLY_PROPS = new Set([
  'initial', 'animate', 'exit', 'transition', 'variants',
  'whileHover', 'whileTap', 'whileFocus', 'whileInView', 'whileDrag',
  'layout', 'layoutId', 'onAnimationStart', 'onAnimationComplete',
])

function createMotionMock(tag: string) {
  return forwardRef<unknown, Record<string, unknown>>(function MotionMock(props, ref) {
    const rest: Record<string, unknown> = {}
    for (const key of Object.keys(props)) {
      if (!MOTION_ONLY_PROPS.has(key)) rest[key] = props[key]
    }
    return createElement(tag, { ...rest, ref })
  })
}

vi.mock('framer-motion', () => ({
  motion: new Proxy({} as Record<string, unknown>, {
    get: (cache, tag: string) => {
      if (!(tag in cache)) cache[tag] = createMotionMock(tag)
      return cache[tag]
    },
  }),
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
}))

// ── window.matchMedia — not implemented in jsdom; required by useReducedMotion ──
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
