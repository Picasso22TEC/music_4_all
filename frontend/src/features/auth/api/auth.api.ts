import client from '@/shared/api/client'
import type {
  DeviceAuthPollResponseDTO,
  DeviceAuthResponseDTO,
  SessionStatusResponseDTO,
} from '@/shared/types/api.types'
import type { DeviceAuthCode, TidalPlan, TidalUser } from '@/entities'

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
    return {
      deviceCode: data.device_code,
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      verificationUriComplete: data.verification_uri_complete,
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
    await client.post('/auth/logout')
  },
}
