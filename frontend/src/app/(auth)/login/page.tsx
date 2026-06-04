/**
 * Login page — Server Component thin shell.
 *
 * Delegates all interactive logic to LoginForm (client component).
 * Auth flow uses exclusively v2 stack:
 *   POST /session/device-auth  (NOT /auth/device)
 *   GET  /session/device-auth/{deviceCode}  (NOT /auth/status)
 *
 * Legacy imports eliminated:
 *   ✗ store/useAppStore    → features/auth/model/auth.store (v2)
 *   ✗ components/NeonTitle → inline DS tokens in LoginForm
 *   ✗ lib/api              → features/auth/api/auth.api (v2)
 */
import { LoginForm } from '@/features/auth'

export default function LoginPage() {
  return <LoginForm />
}
