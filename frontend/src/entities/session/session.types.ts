export type TidalPlan = 'FREE' | 'HIFI' | 'HIFI_PLUS'

export interface TidalUser {
  readonly id: string
  readonly email: string
  readonly countryCode: string
  readonly plan: TidalPlan
}

export interface TidalSession {
  readonly user: TidalUser
  readonly expiresAt: string
}

export interface DeviceAuthCode {
  readonly deviceCode: string
  readonly userCode: string
  readonly verificationUri: string
  readonly verificationUriComplete: string
  readonly expiresIn: number
  readonly interval: number
}

/** Una sesión de app activa del usuario (panel de dispositivos). */
export interface ActiveSession {
  readonly sid: string
  readonly createdAt: number // Unix (s)
  readonly lastSeen: number // Unix (s)
  readonly ip: string
  readonly userAgent: string
  readonly current: boolean
}
