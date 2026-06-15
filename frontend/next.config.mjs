/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'
    return [
      {
        // Strip /api prefix — frontend llama /api/auth/status → backend recibe /auth/status
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
      {
        source: '/ws/:path*',
        destination: `${backendUrl}/ws/:path*`,
      },
    ]
  },
  images: {
    // Bypass server-side image proxy — the Next.js container can't reach
    // resources.tidal.com from inside Docker; browsers can reach it directly.
    unoptimized: true,
  },
  webpack: (config) => {
    // Without this, Playwright writing screenshots/traces into
    // test-results/ (or HTML reports into playwright-report/) during an
    // E2E run is picked up by the dev-mode file watcher, which triggers a
    // Fast Refresh full reload and resets in-progress page state mid-test.
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/test-results/**',
        '**/playwright-report/**',
        '**/blob-report/**',
        '**/tests/e2e/**',
      ],
    }
    return config
  },
}

export default nextConfig
