// Lógica pura del contador de expiración del Device Auth code.
// Separada de la UI para poder probarse de forma aislada (Vitest).

/**
 * Milisegundos restantes hasta la expiración. Se calcula desde el timestamp
 * absoluto de emisión (no un contador en memoria), de modo que sigue siendo
 * correcto tras cambiar de pestaña / suspender. Nunca devuelve negativo.
 */
export function computeRemainingMs(issuedAt: number, expiresIn: number, now: number): number {
  return Math.max(0, issuedAt + expiresIn * 1000 - now)
}

/**
 * Formatea milisegundos como `mm:ss`. Redondea los segundos hacia arriba para
 * no mostrar `00:00` antes de que el código realmente expire.
 */
export function formatMmSs(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
