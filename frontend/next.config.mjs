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
}

export default nextConfig
