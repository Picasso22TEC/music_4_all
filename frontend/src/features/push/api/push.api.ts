import client from '@/shared/api/client'

interface PublicKeyDTO {
  enabled: boolean
  public_key: string | null
}

export const pushApi = {
  /** ¿Está el push activo en el servidor? Devuelve la applicationServerKey. */
  async getStatus(): Promise<{ enabled: boolean; publicKey: string | null }> {
    const { data } = await client.get<PublicKeyDTO>('/push/public-key')
    return { enabled: data.enabled, publicKey: data.public_key }
  },

  /** Registra la suscripción del navegador (el JSON de `PushSubscription.toJSON()`). */
  async subscribe(subscription: PushSubscriptionJSON): Promise<void> {
    await client.post('/push/subscribe', subscription)
  },

  /** Da de baja una suscripción por su endpoint. */
  async unsubscribe(endpoint: string): Promise<void> {
    await client.delete('/push/subscribe', { data: { endpoint } })
  },
}
