'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, FileText, Copyright, ShieldAlert } from 'lucide-react'

import { useSettingsStore } from '@/features/settings'
import {
  HiFiConnection,
  HIFI_LOCKED_HINT,
  useAuthStore,
  useLockedDownloadQualities,
  useLogoutMutation,
} from '@/features/auth'
import { Button, Card, QualitySelector } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

export default function SettingsPage() {
  const router = useRouter()

  const audioQuality    = useSettingsStore((s) => s.audioQuality)
  const setAudioQuality = useSettingsStore((s) => s.setAudioQuality)
  const reduceEffects    = useSettingsStore((s) => s.reduceEffects)
  const setReduceEffects = useSettingsStore((s) => s.setReduceEffects)

  const user   = useAuthStore((s) => s.user)
  const logout = useLogoutMutation()
  const lockedQualities = useLockedDownloadQualities()

  function handleSignOut() {
    logout.mutate(undefined, {
      // Cerrar sesión en el cliente pase lo que pase (aunque el backend falle):
      // clearSession borra la cookie y pone status 'unauthenticated'.
      onSettled: () => {
        useAuthStore.getState().clearSession()
        router.replace('/login')
      },
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-sans text-2xl font-bold text-primary">Settings</h1>
        <p className="mt-1 font-sans text-sm text-secondary">
          Manage your account and preferences
        </p>
      </div>

      {/* ── Account ──────────────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-sans text-base font-semibold text-primary">Account</h2>
            <p className="mt-1 font-sans text-sm text-secondary">
              Your connected Tidal account.
            </p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate font-sans text-sm text-primary">
                {user?.email ?? 'Not signed in'}
              </p>
              {user?.plan && (
                <p className="mt-0.5 font-mono text-2xs uppercase tracking-wider text-teal-400">
                  Tidal {user.plan}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSignOut}
              disabled={logout.isPending}
              aria-label="Sign out of your Tidal account"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              {logout.isPending ? 'Signing out…' : 'Sign out'}
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Download quality ─────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-sans text-base font-semibold text-primary">
              Download quality
            </h2>
            <p className="mt-1 font-sans text-sm text-secondary">
              Your default audio quality — used everywhere you download (dashboard,
              album and artist pages).
            </p>
          </div>
          <QualitySelector
            value={audioQuality}
            onChange={setAudioQuality}
            disabledValues={lockedQualities}
            lockedHint={HIFI_LOCKED_HINT}
          />
        </div>
      </Card>

      {/* ── Hi-Fi 16-bit (segunda sesión Tidal PKCE) ─────────────────── */}
      <HiFiConnection />

      {/* ── Appearance ───────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-sans text-base font-semibold text-primary">
              Reduce visual effects
            </h2>
            <p className="mt-1 font-sans text-sm text-secondary">
              Hide the decorative record-shop scene for a calmer, faster interface.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={reduceEffects}
            aria-label="Reduce visual effects"
            onClick={() => setReduceEffects(!reduceEffects)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:shadow-glow-focus',
              reduceEffects ? 'bg-teal-500' : 'bg-surface-rack',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'inline-block h-4 w-4 rounded-full bg-primary shadow-sm',
                'transition-transform duration-150',
                reduceEffects ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </button>
        </div>
      </Card>

      {/* ── Legal & about ────────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-sans text-base font-semibold text-primary">Legal &amp; about</h2>
            <p className="mt-1 font-sans text-sm text-secondary">
              Music 4 All is an unofficial tool and is not affiliated with Tidal.
            </p>
          </div>
          <nav aria-label="Legal documents" className="flex flex-col divide-y divide-subtle">
            {[
              { href: '/legal/terms', label: 'Terms of Service', Icon: FileText },
              { href: '/legal/copyright', label: 'Copyright & DMCA', Icon: Copyright },
              { href: '/legal/disclaimer', label: 'Disclaimer', Icon: ShieldAlert },
            ].map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 py-3 font-sans text-sm text-secondary hover:text-teal-400 focus-visible:outline-none focus-visible:shadow-glow-focus"
              >
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </Card>
    </div>
  )
}
