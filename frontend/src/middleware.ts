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

// httpOnly session cookie issued by the backend (must match backend
// settings.session_cookie_name). Client JS cannot read/spoof it; the middleware
// (server-side) can, so route protection is enforced against the real session.
const SESSION_COOKIE = 'm4a_sid'

/**
 * Middleware — server-side route protection backed by the httpOnly session cookie.
 *
 * El backend emite `m4a_sid` al entrar (httpOnly + SameSite=Lax) y la borra al salir.
 * Al ser httpOnly no se puede falsificar desde JS, así que su **ausencia** es señal
 * fiable de que no hay sesión y evita renderizar el shell privado a un visitante.
 *
 * Lo que su presencia **no** garantiza es que la sesión siga viva: puede haber
 * caducado, haber sido revocada desde otro dispositivo o haberse borrado en el
 * servidor. Por eso aquí no se bloquea `/login`: hacerlo dejaba atrapado a quien
 * tuviera una cookie obsoleta — el cliente detectaba la sesión muerta y mandaba a
 * `/login`, y el middleware lo devolvía al dashboard, sin salida salvo borrar la
 * cookie a mano. `/login` siempre debe ser alcanzable; quien ya tenga sesión válida
 * y entre ahí simplemente vuelve a autenticarse.
 *
 * Flow:
 *  - No cookie + protected route → redirect to /login
 *  - Everything else → pass through (el backend valida cada petición contra Redis)
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = !!request.cookies.get(SESSION_COOKIE)?.value

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))

  if (!hasSession && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
