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
