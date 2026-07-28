import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import TermsPage from '@/app/legal/terms/page'
import CopyrightPage from '@/app/legal/copyright/page'
import DisclaimerPage from '@/app/legal/disclaimer/page'

// Los documentos legales son Server Components estáticos (sin next/link ni APIs de
// servidor): usan LegalDocument + anclas planas, así que renderizan en jsdom.

describe('legal documents', () => {
  it('Terms renders with the template banner and acceptable-use section', () => {
    render(<TermsPage />)
    expect(
      screen.getByRole('heading', { level: 1, name: /terms of service/i })
    ).toBeVisible()
    // Cada documento debe advertir que es una plantilla, no asesoría legal.
    expect(screen.getByText(/not legal advice/i)).toBeVisible()
    expect(screen.getByRole('heading', { name: /acceptable use/i })).toBeVisible()
  })

  it('Copyright includes DMCA takedown steps and a repeat-infringer policy', () => {
    render(<CopyrightPage />)
    expect(
      screen.getByRole('heading', { name: /copyright & dmca policy/i })
    ).toBeVisible()
    expect(screen.getByText(/takedown notice/i)).toBeInTheDocument()
    expect(screen.getByText(/repeat-infringer/i)).toBeInTheDocument()
  })

  it('Disclaimer states no Tidal affiliation and that access may be revoked', () => {
    render(<DisclaimerPage />)
    expect(screen.getByText(/no affiliation with tidal/i)).toBeInTheDocument()
    // Divulgación del riesgo de revocación (client_id compartido, riesgo del plan).
    expect(screen.getByText(/revoked at any/i)).toBeInTheDocument()
  })
})
