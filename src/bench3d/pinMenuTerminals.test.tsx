// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { selectableTargets } from '../bench/benchState'
import type { Connections, Part, PartKind } from '../project/types'
import { PinMenu } from './PinMenu'

const pin = (physical: number) => ({ type: 'pin' as const, physical })
const part = (kind: PartKind, connections: Connections = {}): Part => ({ id: 'p1', kind, x: 0, y: 0, connections })

function open(p: Part, terminal: string, extra: Partial<React.ComponentProps<typeof PinMenu>> = {}) {
  const targets = selectableTargets({ parts: [p], connecting: p.id, error: null }, p.id, terminal)
  const handlers = { onPick: vi.fn(), onClose: vi.fn(), onTerminal: vi.fn(), onAuto: vi.fn() }
  render(<PinMenu part={p} targets={targets} terminal={terminal} {...handlers} {...extra} />)
  return handlers
}

describe('PinMenu met meerdere aansluitingen', () => {
  it('toont de aansluitingen van een servo met hun stand', () => {
    open(part('servo', { signal: pin(12) }), 'v5')
    const list = screen.getByRole('group', { name: 'Aansluitingen' })
    const names = within(list).getAllByRole('button').map((b) => b.textContent)
    expect(names).toHaveLength(3)
    expect(names[0]).toContain('Signaal')
    expect(names[0]).toContain('GPIO 18')
    expect(names[1]).toContain('5V')
    expect(names[1]).toContain('nog niet')
    expect(within(list).getByRole('button', { name: /5V/ })).toHaveAttribute('aria-pressed', 'true')
  })
  it('een andere aansluiting kiezen roept onTerminal aan', () => {
    const { onTerminal } = open(part('servo'), 'signal')
    fireEvent.click(within(screen.getByRole('group', { name: 'Aansluitingen' })).getByRole('button', { name: /GND/ }))
    expect(onTerminal).toHaveBeenCalledWith('gnd')
  })
  it('5V-aansluiting: alleen de 5V-pinnen zijn te kiezen en pin 2 is voorgesteld', () => {
    const { onPick } = open(part('servo'), 'v5')
    const grid = screen.getByRole('group', { name: 'Pinnen van de Pi' })
    const enabled = within(grid).getAllByRole('button').filter((b) => !(b as HTMLButtonElement).disabled).map((b) => b.getAttribute('aria-label'))
    expect(enabled).toEqual(['Pin 2, 5V', 'Pin 4, 5V'])
    expect(screen.getByRole('button', { name: 'Pin 2, 5V' })).toHaveAttribute('data-suggested', 'true')
    expect(screen.getByRole('button', { name: 'Pin 4, 5V' })).not.toHaveAttribute('data-suggested')
    fireEvent.click(screen.getByRole('button', { name: 'Pin 2, 5V' }))
    expect(onPick).toHaveBeenCalledWith({ type: 'pin', physical: 2 })
  })
  it('OLED SDA: alleen pin 3 is kiesbaar; de andere pinnen leggen in hun tooltip uit waarom niet', () => {
    open(part('oled'), 'sda')
    const grid = screen.getByRole('group', { name: 'Pinnen van de Pi' })
    expect(within(grid).getAllByRole('button').filter((b) => !(b as HTMLButtonElement).disabled)).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Pin 3, GPIO 2' })).toHaveAttribute('data-suggested', 'true')
    const other = screen.getByRole('button', { name: 'Pin 11, GPIO 17' })
    expect(other).toBeDisabled()
    expect(other.getAttribute('title')).toContain('SDA')
    expect(other.getAttribute('title')).toContain('GPIO 2')
  })
  it('legt bij de gekozen aansluiting uit waarom hij zo moet', () => {
    open(part('oled'), 'scl')
    expect(screen.getByText(/kloklijn van de I²C-bus/)).toBeInTheDocument()
  })
  it('de huidige pin van de aansluiting is gemarkeerd', () => {
    open(part('servo', { v5: pin(4) }), 'v5')
    expect(screen.getByRole('button', { name: 'Pin 4, 5V' })).toHaveAttribute('aria-current', 'true')
  })
  it('"Sluit alles voorgesteld aan" roept onAuto aan', () => {
    const { onAuto } = open(part('oled'), 'sda')
    fireEvent.click(screen.getByRole('button', { name: 'Sluit alles voorgesteld aan' }))
    expect(onAuto).toHaveBeenCalled()
  })
  it('de titel noemt het onderdeel', () => {
    open(part('servo'), 'signal')
    expect(screen.getByRole('heading')).toHaveTextContent('Aansluitingen van de servo')
  })
  it('een onderdeel met één aansluiting heeft geen aansluitingenlijst en geen automatisch-knop', () => {
    open(part('led'), 'signal')
    expect(screen.queryByRole('group', { name: 'Aansluitingen' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Sluit alles voorgesteld aan' })).toBeNull()
  })
})
