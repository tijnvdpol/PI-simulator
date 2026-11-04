// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useReducer } from 'react'
import { describe, expect, it } from 'vitest'
import { benchReducer, initialBench, type BenchState } from '../benchState'
import { DRAG_TYPE } from '../../ui/PartsTray'
import { Bench } from './Bench'
import type { PartKind } from '../../project/types'

function Wrapper({ locked = false, start = initialBench }: { locked?: boolean; start?: BenchState }) {
  const [s, dispatch] = useReducer(benchReducer, start)
  return <Bench parts={s.parts} connecting={s.connecting} error={s.error} locked={locked} dispatch={dispatch} />
}

const drop = (container: HTMLElement, kind: PartKind) => {
  const target = container.querySelector('[data-testid="bench"]')!
  fireEvent.drop(target, { clientX: 300, clientY: 120, dataTransfer: { getData: (t: string) => (t === DRAG_TYPE ? kind : ''), types: [DRAG_TYPE] } })
}
const part = (container: HTMLElement) => container.querySelector('[data-part-id]') as SVGElement
const pins = (container: HTMLElement, sel: string) => container.querySelectorAll(`[data-physical][data-selectable="${sel}"]`)

describe('Bench', () => {
  it('drop van een led voegt een onderdeel toe', () => {
    const { container } = render(<Wrapper />)
    drop(container, 'led')
    expect(container.querySelectorAll('[data-part-id]')).toHaveLength(1)
    expect(part(container).getAttribute('data-kind')).toBe('led')
  })
  it('klik op de led toont 38 selecteerbare pinnen en een hint', () => {
    const { container } = render(<Wrapper />)
    drop(container, 'led')
    fireEvent.click(part(container))
    expect(pins(container, 'true')).toHaveLength(38)
    expect(screen.getByText(/Kies een pin voor de led/)).toBeInTheDocument()
  })
  it('klik op pin 11 verbindt de led en tekent draden', () => {
    const { container } = render(<Wrapper />)
    drop(container, 'led')
    fireEvent.click(part(container))
    fireEvent.click(container.querySelector('[data-physical="11"]')!)
    expect(pins(container, 'true')).toHaveLength(0)
    expect(container.querySelector('[data-wire-id$=":signal"]')).not.toBeNull()
    expect(container.querySelector('[data-wire-color="black"]')).not.toBeNull()
  })
  it('led op pin 2 toont een waarschuwingskaartje met 5V', () => {
    const { container } = render(<Wrapper />)
    drop(container, 'led')
    fireEvent.click(part(container))
    fireEvent.click(container.querySelector('[data-physical="2"]')!)
    expect(screen.getByRole('status')).toHaveTextContent('5V')
  })
  it('bezette pin geeft een foutmelding op de werkbank', () => {
    const { container } = render(<Wrapper />)
    drop(container, 'led')
    drop(container, 'button')
    const [a, b] = Array.from(container.querySelectorAll('[data-part-id]'))
    fireEvent.click(a)
    fireEvent.click(container.querySelector('[data-physical="11"]')!)
    fireEvent.click(b)
    expect(pins(container, 'true')).toHaveLength(37) // 11 is bezet
    expect(container.querySelector('[data-physical="11"]')).toHaveAttribute('data-selectable', 'false')
  })
  it('Escape annuleert de pin-keuze', () => {
    const { container } = render(<Wrapper />)
    drop(container, 'led')
    fireEvent.click(part(container))
    expect(pins(container, 'true').length).toBeGreaterThan(0)
    act(() => { fireEvent.keyDown(window, { key: 'Escape' }) })
    expect(pins(container, 'true')).toHaveLength(0)
    expect(screen.queryByText(/Kies een pin/)).toBeNull()
  })
  it('potmeter toont kanalen CH0–CH7 en geen selecteerbare Pi-pinnen', () => {
    const { container } = render(<Wrapper />)
    drop(container, 'potentiometer')
    expect(container.querySelector('[data-testid="mcp3008"]')).not.toBeNull()
    fireEvent.click(part(container))
    expect(container.querySelectorAll('[data-channel][data-selectable="true"]')).toHaveLength(8)
    expect(pins(container, 'true')).toHaveLength(0)
    fireEvent.click(container.querySelector('[data-channel="3"]')!)
    expect(container.querySelector('[data-wire-id$=":signal"]')).not.toBeNull()
    expect(container.querySelector('[data-wire-id="chip:MOSI"]')).not.toBeNull()
  })
  it('led-kleur kiezen en onderdeel verwijderen via de knoppenbalk', () => {
    const { container } = render(<Wrapper />)
    drop(container, 'led')
    fireEvent.click(part(container))
    fireEvent.click(screen.getByRole('button', { name: 'Blauw' }))
    expect(part(container).getAttribute('data-color')).toBe('blue')
    fireEvent.click(screen.getByRole('button', { name: 'Verwijder' }))
    expect(container.querySelectorAll('[data-part-id]')).toHaveLength(0)
  })
  it('vergrendeld: drop en klik doen niets, hint staat in beeld', () => {
    const start = benchReducer(initialBench, { type: 'add', kind: 'led', x: 100, y: 100 })
    const { container } = render(<Wrapper locked start={start} />)
    drop(container, 'button')
    expect(container.querySelectorAll('[data-part-id]')).toHaveLength(1)
    fireEvent.click(part(container))
    expect(pins(container, 'true')).toHaveLength(0)
    expect(screen.getByText('Stop eerst om te bewerken')).toBeInTheDocument()
  })
})
