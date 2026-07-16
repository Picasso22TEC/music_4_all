import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require an authenticated session
const PROTECTED_PATHS = [
  '/dashboard',
  '/library',
  '/downloads',
  '/history',
  '/settings',
  '/artist',
  '/album',
]
// Routes that redirect to dashboard when already authenticated
const AUTH_PATHS = ['/login']

// httpOnly session cookie issued by the backend (must match backend
// settings.session_cookie_name). Client JS cannot read/spoof it; the middleware
// (server-side) can, so route protection is enforced against the real session.
const SESSION_COOKIE = 'm4a_sid'

/**
 * Middleware — server-side route protection backed by the httpOnly session cookie.
 *
 * The `m4a_sid` cookie is set by the backend on successful Tidal login (Set-Cookie,
 * httpOnly + SameSite=Lax) and cleared on logout. Because it is httpOnly it cannot be
 * forged from client JS, so its presence is a trustworthy gate here (the backend still
 * re-validates every request against Redis; this only avoids rendering protected shells
 * for clearly-unauthenticated visitors).
 *
 * Flow:
 *  - No cookie + protected route → redirect to /login
 *  - Cookie present + auth route (/login) → redirect to /dashboard
 *  - Everything else → pass through
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = !!request.cookies.get(SESSION_COOKIE)?.value

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))
  const isAuthRoute = AUTH_PATHS.some((p) => pathname.startsWith(p))

  if (!hasSession && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (hasSession && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
