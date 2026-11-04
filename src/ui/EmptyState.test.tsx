// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EmptyState } from './EmptyState'
import { PartsTray } from './PartsTray'

describe('EmptyState', () => {
  it('toont de uitnodiging en de knop "Open een voorbeeld"', () => {
    const open = vi.fn()
    render(<EmptyState onOpenExamples={open} />)
    expect(screen.getByText('Sleep een led naar je Pi om te beginnen')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open een voorbeeld' }))
    expect(open).toHaveBeenCalledTimes(1)
  })
})

describe('PartsTray', () => {
  it('toont 5 kaartjes met Nederlandse namen', () => {
    render(<PartsTray />)
    for (const name of ['Led', 'Knop', 'Buzzer', 'Temperatuursensor', 'Potmeter']) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
    expect(document.querySelectorAll('[draggable="true"]')).toHaveLength(5)
  })
  it('zet het onderdeelsoort in de sleepdata', () => {
    render(<PartsTray />)
    const setData = vi.fn()
    fireEvent.dragStart(screen.getByText('Knop').closest('[draggable]')!, { dataTransfer: { setData, effectAllowed: '' } })
    expect(setData).toHaveBeenCalledWith('application/x-pisim-part', 'button')
  })
})
