import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { QualitySelector } from '@/shared/ui/QualitySelector/QualitySelector'

const HINT = 'Connect Hi-Fi in Settings to download 16-bit.'

describe('QualitySelector — Hi-Fi gating (disabledValues)', () => {
  it('renders the four quality radios', () => {
    render(<QualitySelector value="MASTER" onChange={() => {}} />)
    expect(screen.getAllByRole('radio')).toHaveLength(4)
  })

  it('locks the 16-bit (HIGH) option when it is in disabledValues', () => {
    render(
      <QualitySelector
        value="MASTER"
        onChange={() => {}}
        disabledValues={['HIGH']}
        lockedHint={HINT}
      />
    )
    // El botón HIGH ("FLAC") queda deshabilitado y su nombre accesible incluye el hint.
    const high = screen.getByRole('radio', { name: /16-bit FLAC.*Connect Hi-Fi/is })
    expect(high).toBeDisabled()
    expect(high).toHaveAttribute('title', HINT)
  })

  it('does not select a locked option on click', () => {
    const onChange = vi.fn()
    render(
      <QualitySelector
        value="MASTER"
        onChange={onChange}
        disabledValues={['HIGH']}
        lockedHint={HINT}
      />
    )
    fireEvent.click(screen.getByRole('radio', { name: /16-bit FLAC/i }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('still selects enabled options', () => {
    const onChange = vi.fn()
    render(
      <QualitySelector
        value="MASTER"
        onChange={onChange}
        disabledValues={['HIGH']}
        lockedHint={HINT}
      />
    )
    fireEvent.click(screen.getByRole('radio', { name: /AAC 320/i }))
    expect(onChange).toHaveBeenCalledWith('NORMAL')
  })

  it('keeps the group tab-reachable when the selected option is locked', () => {
    // Escenario: el default guardado es HIGH pero la Hi-Fi no está conectada.
    render(
      <QualitySelector
        value="HIGH"
        onChange={() => {}}
        disabledValues={['HIGH']}
        lockedHint={HINT}
      />
    )
    // El foco (tabIndex 0) cae en la primera opción habilitada (MASTER), no en la bloqueada.
    const master = screen.getByRole('radio', { name: /Master Quality/i })
    expect(master).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('radio', { name: /16-bit FLAC/i })).toHaveAttribute('tabindex', '-1')
  })
})
