import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require an authenticated session
const PROTECTED_PATHS = ['/dashboard', '/library', '/downloads', '/history', '/settings', '/artist']
// Routes that redirect to dashboard when already authenticated
const AUTH_PATHS = ['/login']

/**
 * Middleware — cookie-based route protection (TD-07).
 *
 * The `music4all_session` cookie is set client-side by auth.store (setAuthenticated,
 * clearSession, setExpired, onRehydrateStorage). It is a non-httpOnly convenience
 * cookie; the ground truth for auth is the Tidal token managed by the backend.
 *
 * Flow:
 *  - No cookie + protected route → redirect to /login
 *  - Cookie present + auth route (/login) → redirect to /dashboard
 *  - Everything else → pass through
 *
 * Note: on first load after the update, users with a valid auth.store but no cookie
 * are redirected to /login. LoginForm detects the authenticated store state, sets
 * the cookie via onRehydrateStorage, then redirects back to /dashboard.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = !!request.cookies.get('music4all_session')?.value

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
