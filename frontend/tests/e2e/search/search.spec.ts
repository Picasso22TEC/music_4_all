import { expect, test } from '@playwright/test'

import { buildSearchResponse, TOXICITY_ALBUM_DTO } from '../fixtures/album'
import { mockAuthenticatedSession } from '../utils/auth'

/**
 * E2E — Dashboard search (`/dashboard`).
 *
 * Seeds an authenticated session directly into auth.store (localStorage) so
 * the test starts on the dashboard without going through the Tidal device
 * auth flow, and mocks GET /search.
 */

test.describe('Dashboard search', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page)
    // DownloadPanel mounts useDownloadSocket() on every (app) route.
    await page.routeWebSocket('**/ws/downloads', () => {})
  })

  test('typing a query shows matching album results', async ({ page }) => {
    await page.route('**/api/search**', async (route) => {
      const url = new URL(route.request().url())
      expect(url.searchParams.get('q')).toBe('System of a Down')
      await route.fulfill({ json: buildSearchResponse() })
    })

    await page.goto('/dashboard')

    const searchInput = page.getByRole('textbox', {
      name: 'Search albums, tracks, or paste a Tidal URL',
    })
    await expect(searchInput).toBeVisible()
    await searchInput.fill('System of a Down')

    const albumCard = page.getByRole('article', {
      name: `${TOXICITY_ALBUM_DTO.title} by ${TOXICITY_ALBUM_DTO.artist.name}, 2001`,
    })
    await expect(albumCard).toBeVisible()
    await expect(albumCard.getByRole('heading', { name: TOXICITY_ALBUM_DTO.title })).toBeVisible()
    await expect(albumCard.getByText(TOXICITY_ALBUM_DTO.artist.name)).toBeVisible()
  })

  test('shows the "no results" state for a query with no matches', async ({ page }) => {
    await page.route('**/api/search**', async (route) => {
      await route.fulfill({ json: buildSearchResponse([]) })
    })

    await page.goto('/dashboard')

    const searchInput = page.getByRole('textbox', {
      name: 'Search albums, tracks, or paste a Tidal URL',
    })
    await searchInput.fill('a query with absolutely no matches')

    await expect(page.getByRole('heading', { name: 'No results found' })).toBeVisible()
  })

  test('clicking an album triggers the open-detail handler', async ({ page }) => {
    await page.route('**/api/search**', async (route) => {
      await route.fulfill({ json: buildSearchResponse() })
    })

    await page.goto('/dashboard')

    const searchInput = page.getByRole('textbox', {
      name: 'Search albums, tracks, or paste a Tidal URL',
    })
    await searchInput.fill('System of a Down')

    const albumCard = page.getByRole('article', {
      name: `${TOXICITY_ALBUM_DTO.title} by ${TOXICITY_ALBUM_DTO.artist.name}, 2001`,
    })
    await expect(albumCard).toBeVisible()

    // AlbumDetailPanel is deferred to Phase 6C — clicking the artwork
    // currently only logs the intent via console.info(). Until the detail
    // view ships, this is the observable contract for "open album".
    const openDetailLog = page.waitForEvent('console', (msg) =>
      msg.text().includes('[Dashboard] Open album detail:')
    )

    await albumCard.getByRole('button', { name: `Open details for ${TOXICITY_ALBUM_DTO.title}` }).click()

    const msg = await openDetailLog
    expect(msg.text()).toContain(TOXICITY_ALBUM_DTO.id)
  })
})
