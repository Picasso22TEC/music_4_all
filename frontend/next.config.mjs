/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
      // NOTA: no se define rewrite para /ws/:path*. El dev-server de Next.js 14.2
      // crashea al hacer proxy del upgrade WebSocket hacia una URL absoluta. En
      // desarrollo el cliente conecta directo al backend vía NEXT_PUBLIC_WS_URL
      // (ver shared/config/ws.config.ts); en producción nginx proxea /ws/ al backend.
    ]
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
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