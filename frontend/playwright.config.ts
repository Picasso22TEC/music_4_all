import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E configuration — Music 4 All frontend.
 *
 * Runs against `next dev` (port 3000). All backend/Tidal calls are mocked
 * via page.route()/page.routeWebSocket() in each spec — no real backend,
 * database, or Tidal credentials are required.
 */

// Windows + local (non-CI) runs occasionally leave a WebKit helper process
// (Playwright.exe / WebKitWebProcess.exe / ...) alive after browser.close(),
// which keeps that worker's Node process from exiting and triggers
// Playwright's "worker process did not exit ... force-killed it" after the
// default PWTEST_CHILD_PROCESS_TIMEOUT (300_000ms) — despite all tests
// passing. See docs/operations/RUNBOOK.md "Problemas conocidos" (RB-07).
const isWindowsLocal = process.platform === 'win32' && !process.env.CI
if (isWindowsLocal && !process.env.PWTEST_CHILD_PROCESS_TIMEOUT) {
  // Bounds the wasted wall-clock time from 5 minutes down to 30s if the
  // zombie-process hang occurs; does not change behaviour on CI (ubuntu-latest).
  process.env.PWTEST_CHILD_PROCESS_TIMEOUT = '30000'
}

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Running webkit alongside other browsers concurrently increases the
  // chance of the Windows-local zombie-process hang described above —
  // serialise local runs to reduce (not eliminate) that risk.
  workers: process.env.CI ? 1 : isWindowsLocal ? 1 : undefined,
  reporter: process.env.CI ? [['html'], ['github']] : [['html']],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
