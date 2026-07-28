import client from '@/shared/api/client'
import type {
  DeviceAuthPollResponseDTO,
  DeviceAuthResponseDTO,
  PkceStartResponseDTO,
  PkceStatusResponseDTO,
  SessionListResponseDTO,
  SessionStatusResponseDTO,
} from '@/shared/types/api.types'
import type { ActiveSession, DeviceAuthCode, TidalPlan, TidalUser } from '@/entities'

/**
 * Ensures a Tidal OAuth URL has a valid https:// scheme.
 * Tidal's Device Authorization API returns bare hostnames without scheme
 * (e.g. "link.tidal.com/ABCDE"). An schemeless value used as <a href> or in
 * window.open() is treated by browsers as a relative path, causing a 404.
 * http:// is preserved as-is (dev/proxy environments).
 */
function ensureHttps(url: string | undefined | null): string {
  const trimmed = (url ?? '').trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}

function mapUser(dto: SessionStatusResponseDTO['user']): TidalUser | null {
  if (!dto) return null
  return {
    id: dto.id,
    email: dto.email,
    countryCode: dto.country_code,
    plan: dto.plan as TidalPlan,
  }
}

export const authApi = {
  async checkStatus() {
    const { data } = await client.get<SessionStatusResponseDTO>('/session/status')
    return {
      status: data.status,
      user: mapUser(data.user),
      expiresAt: data.expires_at ?? null,
    }
  },

  async initDeviceAuth(): Promise<DeviceAuthCode> {
    const { data } = await client.post<DeviceAuthResponseDTO>('/session/device-auth', {})
    const verificationUri = ensureHttps(data.verification_uri)
    // Prefer verification_uri_complete; fall back to verification_uri + "/" + user_code
    // if a future Tidal API version omits it.
    const verificationUriComplete =
      ensureHttps(data.verification_uri_complete) ||
      (verificationUri && data.user_code ? `${verificationUri}/${data.user_code}` : verificationUri)
    return {
      deviceCode: data.device_code,
      userCode: data.user_code,
      verificationUri,
      verificationUriComplete,
      expiresIn: data.expires_in,
      interval: data.interval,
    }
  },

  async pollDeviceAuth(deviceCode: string) {
    const { data } = await client.get<DeviceAuthPollResponseDTO>(
      `/session/device-auth/${deviceCode}`
    )
    return {
      status: data.status,
      user: data.user
        ? {
            id: data.user.id,
            email: data.user.email,
            countryCode: data.user.country_code,
            plan: data.user.plan as TidalPlan,
          }
        : undefined,
      expiresAt: data.expires_at ?? undefined,
    }
  },

  /**
   * Reporta actividad real del usuario y renueva la ventana de inactividad.
   *
   * El plazo lo dicta el servidor: duplicarlo aquí se desincronizaría en cuanto
   * alguien cambiase `session_idle_ttl`.
   */
  async keepalive(): Promise<{ idleTtlSeconds: number; expiresInSeconds: number }> {
    const { data } = await client.post<{
      idle_ttl_seconds: number
      expires_in_seconds: number
    }>('/session/keepalive')
    return {
      idleTtlSeconds: data.idle_ttl_seconds,
      expiresInSeconds: data.expires_in_seconds,
    }
  },

  async logout(): Promise<void> {
    // v2 session logout: clears the httpOnly m4a_sid cookie + the app session in Redis.
    await client.post('/session/logout')
  },

  // ── Panel de sesiones activas (dispositivos) ────────────────────────────────

  /** Lista las sesiones de app activas del usuario (una por dispositivo/navegador). */
  async listSessions(): Promise<ActiveSession[]> {
    const { data } = await client.get<SessionListResponseDTO>('/session/sessions')
    return data.sessions.map((s) => ({
      sid: s.sid,
      createdAt: s.created_at,
      lastSeen: s.last_seen,
      ip: s.ip,
      userAgent: s.user_agent,
      current: s.current,
    }))
  },

  /** Cierra una sesión concreta (otro dispositivo) por su sid. */
  async revokeSession(sid: string): Promise<void> {
    await client.delete(`/session/sessions/${encodeURIComponent(sid)}`)
  },

  /** Cierra todas las demás sesiones, conservando la actual. Devuelve cuántas cerró. */
  async revokeOtherSessions(): Promise<number> {
    const { data } = await client.delete<{ revoked: number }>('/session/sessions')
    return data.revoked
  },

  // ── PKCE: conexión Hi-Fi 16-bit (segunda sesión Tidal del usuario) ──────────

  /** ¿El usuario tiene conectada la sesión Hi-Fi (16-bit)? */
  async pkceStatus(): Promise<boolean> {
    const { data } = await client.get<PkceStatusResponseDTO>('/session/pkce/status')
    return data.connected
  },

  /**
   * Inicia el login PKCE y devuelve la URL que el usuario debe abrir. Al loguearse,
   * Tidal lo redirige a una página "Oops" cuya URL completa debe pegar para completar.
   */
  async pkceStart(): Promise<string> {
    const { data } = await client.post<PkceStartResponseDTO>('/session/pkce/start', {})
    return ensureHttps(data.login_url)
  },

  /** Canjea la URL "Oops" pegada por el usuario; devuelve si quedó conectado. */
  async pkceComplete(redirectUrl: string): Promise<boolean> {
    const { data } = await client.post<PkceStatusResponseDTO>('/session/pkce/complete', {
      redirect_url: redirectUrl,
    })
    return data.connected
  },

  /** Desconecta la sesión Hi-Fi (borra los tokens PKCE). Devuelve `false`. */
  async pkceDisconnect(): Promise<boolean> {
    const { data } = await client.delete<PkceStatusResponseDTO>('/session/pkce')
    return data.connected
  },
}
