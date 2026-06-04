import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require an authenticated session
const PROTECTED_PATHS = ['/dashboard', '/library', '/downloads', '/history', '/settings']
// Routes that redirect to dashboard when already authenticated
const AUTH_PATHS = ['/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // NOTE: Active cookie-based redirection requires RM-03 (httpOnly session_id cookie).
  // Until then this middleware provides the routing scaffold and matcher configuration.
  // Client-side protection is handled by auth.store rehydration in (app)/layout.tsx.
  //
  // When RM-03 is implemented, replace the body with:
  //   const session = request.cookies.get('session_id')
  //   if (PROTECTED_PATHS.some(p => pathname.startsWith(p)) && !session)
  //     return NextResponse.redirect(new URL('/login', request.url))
  //   if (AUTH_PATHS.some(p => pathname.startsWith(p)) && session)
  //     return NextResponse.redirect(new URL('/dashboard', request.url))

  void PROTECTED_PATHS
  void AUTH_PATHS
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
