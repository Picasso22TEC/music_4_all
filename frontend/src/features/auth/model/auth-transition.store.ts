import { create } from 'zustand'

// ─── Canal UI transitorio para la transición Login → Dashboard ────────────────
//
// Store SIN persist y de un solo campo: un contador de eventos. El overlay
// (AuthTransitionOverlay) se suscribe SOLO a este store — nunca a auth.store —
// porque inferir el momento del login desde `status` produce flashes falsos:
// SessionRecoveryModal también llama setAuthenticated() en mitad de sesión, y
// la rehidratación de persist cambia `status` en cada cold load.
//
// Único writer: LoginForm, en el instante real de autorización.

interface AuthTransitionState {
  /** Se incrementa una vez por transición solicitada. */
  requestId: number
  play: () => void
}

export const useAuthTransitionStore = create<AuthTransitionState>()((set) => ({
  requestId: 0,
  play: () => set((s) => ({ requestId: s.requestId + 1 })),
}))

/** Dispara la transición visual Login → Dashboard (chispas + flash). */
export function playAuthTransition(): void {
  useAuthTransitionStore.getState().play()
}
