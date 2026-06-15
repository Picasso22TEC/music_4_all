import type { Page } from '@playwright/test'

const AUTH_STORAGE_KEY = 'music4all-auth'

/**
 * Seeds the persisted auth.store (Zustand `persist` → localStorage) so the
 * app boots in an authenticated state without going through the Tidal
 * Device Authorization flow.
 *
 * Mirrors the shape written by `useAuthStore`'s `partialize` + zustand
 * `persist` middleware: `{ state: {...}, version: 0 }`.
 *
 * Must be called before `page.goto()` — `addInitScript` runs before any
 * page script, so the store rehydrates as authenticated on first load.
 */
export async function mockAuthenticatedSession(page: Page): Promise<void> {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  await page.addInitScript(
    ({ key, expiresAt }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          state: {
            status: 'authenticated',
            user: {
              id: 'qa-user-1',
              email: 'qa@music4all.test',
              countryCode: 'US',
              plan: 'HIFI_PLUS',
            },
            expiresAt,
          },
          version: 0,
        })
      )
    },
    { key: AUTH_STORAGE_KEY, expiresAt }
  )
}
