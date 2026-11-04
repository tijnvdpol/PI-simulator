// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorCard } from './ErrorCard'
import { RunControls } from './RunControls'

const explanation = {
  titel: 'Onbekende naam',
  uitleg: 'Regel 4: je gebruikt `led`, maar die heb je nog niet aangemaakt.',
  regel: 4,
  technisch: "Traceback...\nNameError: name 'led' is not defined",
}

describe('ErrorCard', () => {
  it('toont de uitleg zichtbaar en de technische melding pas na openklappen', () => {
    render(<ErrorCard explanation={explanation} onGotoLine={() => {}} />)
    expect(screen.getByText(/je gebruikt `led`/)).toBeVisible()
    const details = screen.getByText('Technische melding').closest('details')!
    expect(details.open).toBe(false)
    fireEvent.click(screen.getByText('Technische melding'))
    expect(details.open).toBe(true)
    expect(screen.getByText(/NameError: name 'led' is not defined/)).toBeInTheDocument()
  })
  it('klik op het regelnummer roept onGotoLine(4) aan', () => {
    const go = vi.fn()
    render(<ErrorCard explanation={explanation} onGotoLine={go} />)
    fireEvent.click(screen.getByRole('button', { name: /regel 4/i }))
    expect(go).toHaveBeenCalledWith(4)
  })
  it('zonder regelnummer geen knop', () => {
    render(<ErrorCard explanation={{ ...explanation, regel: null }} onGotoLine={() => {}} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('RunControls', () => {
  const noop = () => {}
  it('laden: Start uitgeschakeld en laadtekst zichtbaar', () => {
    render(<RunControls status="laden" onStart={noop} onStop={noop} onRetry={noop} />)
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
    expect(screen.getByText('Python wordt gestart…')).toBeInTheDocument()
  })
  it('klaar: Start actief, Stop uit', () => {
    const start = vi.fn()
    render(<RunControls status="klaar" onStart={start} onStop={noop} onRetry={noop} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(start).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled()
  })
  it('draait: Stop actief, Start uit', () => {
    const stop = vi.fn()
    render(<RunControls status="draait" onStart={noop} onStop={stop} onRetry={noop} />)
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(stop).toHaveBeenCalled()
  })
  it('Review Focus 5: laadfout toont melding en "Opnieuw proberen"', () => {
    const retry = vi.fn()
    render(<RunControls status="laadfout" onStart={noop} onStop={noop} onRetry={retry} />)
    expect(screen.getByText('Python kon niet worden geladen')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Opnieuw proberen' }))
    expect(retry).toHaveBeenCalled()
  })
})
