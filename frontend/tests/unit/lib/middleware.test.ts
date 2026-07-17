import { describe, expect, it } from 'vitest'

import { middleware } from '@/middleware'

// Doble mínimo de NextRequest: al middleware solo le importan la URL y la cookie.
function request(pathname: string, { cookie }: { cookie?: string } = {}) {
  const url = `http://localhost:3000${pathname}`
  return {
    nextUrl: new URL(url),
    url,
    cookies: {
      get: (name: string) =>
        cookie && name === 'm4a_sid' ? { name, value: cookie } : undefined,
    },
  } as unknown as Parameters<typeof middleware>[0]
}

function redirectTarget(response: Response): string | null {
  const location = response.headers.get('location')
  return location ? new URL(location).pathname : null
}

describe('middleware', () => {
  describe('sin cookie de sesión', () => {
    it('manda a /login desde una ruta protegida', () => {
      expect(redirectTarget(middleware(request('/dashboard')))).toBe('/login')
    })

    it('deja pasar /login', () => {
      expect(redirectTarget(middleware(request('/login')))).toBeNull()
    })
  })

  describe('con cookie de sesión', () => {
    it('deja pasar a una ruta protegida', () => {
      expect(redirectTarget(middleware(request('/dashboard', { cookie: 'sid-abc' })))).toBeNull()
    })

    it('deja llegar a /login aunque haya cookie', () => {
      // Regresión del bucle: la cookie solo prueba que EXISTE una sesión, no que
      // siga viva. Al caducar en el servidor, el cliente manda a /login; si el
      // middleware devolvía al dashboard, el usuario quedaba atrapado sin poder
      // volver a entrar (la única salida era borrar la cookie a mano).
      expect(redirectTarget(middleware(request('/login', { cookie: 'sid-obsoleta' })))).toBeNull()
    })
  })

  it('no toca rutas fuera del área protegida', () => {
    expect(redirectTarget(middleware(request('/')))).toBeNull()
  })
})
