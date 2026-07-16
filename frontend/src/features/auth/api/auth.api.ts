import client from '@/shared/api/client'
import type {
  DeviceAuthPollResponseDTO,
  DeviceAuthResponseDTO,
  SessionStatusResponseDTO,
} from '@/shared/types/api.types'
import type { DeviceAuthCode, TidalPlan, TidalUser } from '@/entities'

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

  async logout(): Promise<void> {
    // v2 session logout: clears the httpOnly m4a_sid cookie + the app session in Redis.
    await client.post('/session/logout')
  },
}
