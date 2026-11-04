// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { selectableTargets } from '../bench/benchState'
import { PINS } from '../pinout/pinout'
import type { Part } from '../project/types'
import { PartList } from './PartList'
import { PinMenu } from './PinMenu'

const led: Part = { id: 'part-1', kind: 'led', x: 100, y: 100, color: 'red', connection: null }
const buzzer: Part = { id: 'part-2', kind: 'buzzer', x: 200, y: 100, connection: { type: 'pin', physical: 15 } }
const temp: Part = { id: 'part-3', kind: 'temperature', x: 300, y: 100, connection: null }

const menu = (part: Part, parts: Part[], onPick = vi.fn(), onClose = vi.fn()) => {
  const targets = selectableTargets({ parts, connecting: part.id, error: null }, part.id)
  render(<PinMenu part={part} targets={targets} onPick={onPick} onClose={onClose} />)
  return { onPick, onClose }
}

describe('PinMenu', () => {
  it('toont alle 40 pinnen in pinout-vorm: oneven links, even rechts, pin 1 bovenaan', () => {
    menu(led, [led])
    const group = screen.getByRole('group', { name: 'Pinnen van de Pi' })
    const buttons = within(group).getAllByRole('button')
    expect(buttons).toHaveLength(40)
    const order = buttons.map((b) => Number(/Pin (\d+)/.exec(b.getAttribute('aria-label')!)![1]))
    expect(order.slice(0, 4)).toEqual([1, 2, 3, 4])
    expect(order[38]).toBe(39)
    expect(order[39]).toBe(40)
  })

  it('toont GPIO-nummers voor gpio-pinnen en de naam voor voeding', () => {
    menu(led, [led])
    expect(screen.getByRole('button', { name: 'Pin 11, GPIO 17' })).toHaveTextContent('GPIO 17')
    expect(screen.getByRole('button', { name: 'Pin 2, 5V' })).toHaveTextContent('5V')
    expect(screen.getByRole('button', { name: 'Pin 6, GND' })).toHaveTextContent('GND')
  })

  it('kiest je "GPIO 17": onPick krijgt pin 11', () => {
    const { onPick } = menu(led, [led])
    fireEvent.click(screen.getByRole('button', { name: 'Pin 11, GPIO 17' }))
    expect(onPick).toHaveBeenCalledWith({ type: 'pin', physical: 11 })
  })

  it('pinnen die al in gebruik zijn en de ID-pinnen zijn niet te kiezen; voeding en GND wel', () => {
    const { onPick } = menu(led, [led, buzzer])
    const used = screen.getByRole('button', { name: 'Pin 15, GPIO 22' })
    expect(used).toBeDisabled()
    fireEvent.click(used)
    expect(onPick).not.toHaveBeenCalled()
    for (const p of PINS.filter((x) => x.kind === 'id')) expect(screen.getByRole('button', { name: `Pin ${p.physical}, ${p.naam}` })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Pin 6, GND' })).toBeEnabled()
  })

  it('analoge onderdelen krijgen een lijst met de kanalen CH0–CH7; een bezet kanaal is uit', () => {
    const other: Part = { ...temp, id: 'part-9', connection: { type: 'adc', channel: 2 } }
    const { onPick } = menu(temp, [temp, other])
    expect(screen.queryByRole('group', { name: 'Pinnen van de Pi' })).toBeNull()
    expect(screen.getByRole('button', { name: 'CH2' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'CH1' }))
    expect(onPick).toHaveBeenCalledWith({ type: 'adc', channel: 1 })
  })

  it('sluiten roept onClose aan', () => {
    const { onClose } = menu(led, [led])
    fireEvent.click(screen.getByRole('button', { name: 'Sluiten' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('heeft een Nederlandse titel', () => {
    menu(led, [led])
    expect(screen.getByRole('heading')).toHaveTextContent('Pin voor de led')
  })
})

describe('PartList (toetsenbord)', () => {
  const props = () => ({ parts: [led, buzzer], locked: false, selectedId: null, onSelect: vi.fn(), onRemove: vi.fn(), onPress: vi.fn() })

  it('heeft per onderdeel een knop met naam en GPIO', () => {
    render(<PartList {...props()} />)
    expect(screen.getByRole('button', { name: 'led' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'buzzer · GPIO 22' })).toBeInTheDocument()
  })
  it('Enter/klik kiest het onderdeel; Delete verwijdert het', () => {
    const p = props()
    render(<PartList {...p} />)
    fireEvent.click(screen.getByRole('button', { name: 'led' }))
    expect(p.onSelect).toHaveBeenCalledWith(led)
    fireEvent.keyDown(screen.getByRole('button', { name: 'led' }), { key: 'Delete' })
    expect(p.onRemove).toHaveBeenCalledWith(led)
  })
  it('tijdens het draaien kiest of verwijdert niets, maar drukt spatie de knop in en laat hem los', () => {
    const p = { ...props(), locked: true }
    render(<PartList {...p} />)
    const b = screen.getByRole('button', { name: 'led' })
    fireEvent.click(b)
    fireEvent.keyDown(b, { key: 'Delete' })
    expect(p.onSelect).not.toHaveBeenCalled()
    expect(p.onRemove).not.toHaveBeenCalled()
    fireEvent.keyDown(b, { key: ' ' })
    expect(p.onPress).toHaveBeenLastCalledWith(led, true)
    fireEvent.keyUp(b, { key: ' ' })
    expect(p.onPress).toHaveBeenLastCalledWith(led, false)
  })
  it('toont niets zonder onderdelen', () => {
    const { container } = render(<PartList {...props()} parts={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
