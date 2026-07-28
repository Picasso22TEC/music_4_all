import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PushNotificationsToggle } from '@/features/push/ui/PushNotificationsToggle'
import { usePushNotifications } from '@/features/push/model/usePushNotifications'

vi.mock('@/features/push/model/usePushNotifications', () => ({
  usePushNotifications: vi.fn(),
}))

const mocked = vi.mocked(usePushNotifications)
const enable = vi.fn()
const disable = vi.fn()

function setHook(overrides: Partial<ReturnType<typeof usePushNotifications>>) {
  mocked.mockReturnValue({
    supported: true,
    backendEnabled: true,
    swReady: true,
    subscribed: false,
    permission: 'default',
    busy: false,
    error: null,
    enable,
    disable,
    ...overrides,
  } as ReturnType<typeof usePushNotifications>)
}

beforeEach(() => {
  enable.mockClear()
  disable.mockClear()
})

describe('PushNotificationsToggle', () => {
  it('renders nothing when the browser does not support push', () => {
    setHook({ supported: false })
    const { container } = render(<PushNotificationsToggle />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the server has push disabled', () => {
    setHook({ backendEnabled: false })
    const { container } = render(<PushNotificationsToggle />)
    expect(container).toBeEmptyDOMElement()
  })

  it('enables notifications when the switch is turned on', () => {
    setHook({ subscribed: false })
    render(<PushNotificationsToggle />)
    fireEvent.click(screen.getByRole('switch', { name: /download notifications/i }))
    expect(enable).toHaveBeenCalledTimes(1)
  })

  it('disables notifications when already subscribed', () => {
    setHook({ subscribed: true })
    render(<PushNotificationsToggle />)
    fireEvent.click(screen.getByRole('switch', { name: /download notifications/i }))
    expect(disable).toHaveBeenCalledTimes(1)
  })

  it('disables the switch and prompts to install when no service worker is ready', () => {
    setHook({ swReady: false })
    render(<PushNotificationsToggle />)
    expect(screen.getByRole('switch', { name: /download notifications/i })).toBeDisabled()
    expect(screen.getByText(/install the app/i)).toBeVisible()
  })
})
