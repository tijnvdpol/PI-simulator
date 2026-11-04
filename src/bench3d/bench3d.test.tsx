// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { useReducer } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { benchReducer, initialBench, type BenchState } from '../bench/benchState'
import type { PartKind } from '../project/types'
import { DRAG_TYPE } from '../ui/PartsTray'

// Het canvas zelf tekent niet in jsdom (geen WebGL); alles eromheen (menu's, lijst, meldingen, staat) wel.
vi.mock('@react-three/fiber', async (orig) => ({ ...(await orig<typeof import('@react-three/fiber')>()), Canvas: () => null }))
const { default: Bench3D } = await import('./Bench3D')

function Wrapper({ locked = false, start = initialBench, onPartPress }: { locked?: boolean; start?: BenchState; onPartPress?: (p: unknown, down: boolean) => void }) {
  const [s, dispatch] = useReducer(benchReducer, start)
  return (
    <Bench3D
      parts={s.parts} connecting={s.connecting} error={s.error} locked={locked} dispatch={dispatch} onPartPress={onPartPress}
      sensors={{ values: {}, onChange: () => {} }}
    />
  )
}

const drop = (container: HTMLElement, kind: PartKind) => {
  const target = container.querySelector('[data-testid="bench"]')!
  fireEvent.drop(target, { clientX: 300, clientY: 120, dataTransfer: { getData: (t: string) => (t === DRAG_TYPE ? kind : ''), types: [DRAG_TYPE] } })
}
const list = () => screen.getByRole('list', { name: 'Onderdelen op de werkbank' })
const items = () => within(list()).queryAllByRole('button')
const menu = () => screen.queryByRole('complementary', { name: /Aansluiten/ })

describe('Bench3D', () => {
  it('drop van een led voegt een onderdeel toe', () => {
    const { container } = render(<Wrapper />)
    drop(container, 'led')
    expect(items()).toHaveLength(1)
    expect(items()[0]).toHaveAttribute('data-kind', 'led')
  })

  it('een onderdeel kiezen opent het pinmenu met 38 kiesbare pinnen', () => {
    const { container } = render(<Wrapper />)
    drop(container, 'led')
    expect(menu()).toBeNull()
    fireEvent.click(items()[0])
    expect(menu()).not.toBeNull()
    const pins = within(screen.getByRole('group', { name: 'Pinnen van de Pi' })).getAllByRole('button')
    expect(pins.filter((b) => !(b as HTMLButtonElement).disabled)).toHaveLength(38)
  })

  it('"GPIO 17" kiezen verbindt de led met pin 11 en sluit het menu', () => {
    const { container } = render(<Wrapper />)
    drop(container, 'led')
    fireEvent.click(items()[0])
    fireEvent.click(screen.getByRole('button', { name: 'Pin 11, GPIO 17' }))
    expect(menu()).toBeNull()
    expect(items()[0]).toHaveAccessibleName('led · GPIO 17')
  })

  it('led op pin 2 toont een waarschuwingskaartje met 5V', () => {
    const { container } = render(<Wrapper />)
    drop(container, 'led')
    fireEvent.click(items()[0])
    fireEvent.click(screen.getByRole('button', { name: 'Pin 2, 5V' }))
    expect(screen.getByRole('status')).toHaveTextContent('5V')
  })

  it('een bezette pin is in het menu van het volgende onderdeel uitgeschakeld', () => {
    const { container } = render(<Wrapper />)
    drop(container, 'led')
    drop(container, 'button')
    fireEvent.click(items()[0])
    fireEvent.click(screen.getByRole('button', { name: 'Pin 11, GPIO 17' }))
    fireEvent.click(items()[1])
    expect(screen.getByRole('button', { name: 'Pin 11, GPIO 17' })).toBeDisabled()
    const pins = within(screen.getByRole('group', { name: 'Pinnen van de Pi' })).getAllByRole('button')
    expect(pins.filter((b) => !(b as HTMLButtonElement).disabled)).toHaveLength(37)
  })

  it('Escape annuleert het pinmenu', () => {
    const { container } = render(<Wrapper />)
    drop(container, 'led')
    fireEvent.click(items()[0])
    expect(menu()).not.toBeNull()
    act(() => { fireEvent.keyDown(window, { key: 'Escape' }) })
    expect(menu()).toBeNull()
  })

  it('potmeter: menu met kanalen CH0–CH7; kiezen verbindt met dat kanaal', () => {
    const { container } = render(<Wrapper />)
    drop(container, 'potentiometer')
    fireEvent.click(items()[0])
    expect(screen.queryByRole('group', { name: 'Pinnen van de Pi' })).toBeNull()
    expect(within(screen.getByRole('group', { name: 'Kanalen van de chip' })).getAllByRole('button')).toHaveLength(8)
    fireEvent.click(screen.getByRole('button', { name: 'CH3' }))
    expect(items()[0]).toHaveAccessibleName('potmeter · kanaal 3')
  })

  it('led-kleur kiezen en onderdeel verwijderen via de knoppenbalk', () => {
    const { container } = render(<Wrapper />)
    drop(container, 'led')
    fireEvent.click(items()[0])
    fireEvent.click(screen.getByRole('button', { name: 'Blauw' }))
    expect(screen.getByRole('button', { name: 'Blauw' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Verwijder' }))
    expect(screen.queryByRole('list', { name: 'Onderdelen op de werkbank' })).toBeNull()
  })

  it('Delete verwijdert het gekozen onderdeel', () => {
    const { container } = render(<Wrapper />)
    drop(container, 'led')
    fireEvent.click(items()[0])
    act(() => { fireEvent.keyDown(window, { key: 'Delete' }) })
    expect(screen.queryByRole('list', { name: 'Onderdelen op de werkbank' })).toBeNull()
  })

  it('vergrendeld: drop en klik doen niets en de hint staat in beeld', () => {
    const start = benchReducer(initialBench, { type: 'add', kind: 'led', x: 100, y: 100 })
    const { container } = render(<Wrapper locked start={start} />)
    drop(container, 'button')
    expect(items()).toHaveLength(1)
    fireEvent.click(items()[0])
    expect(menu()).toBeNull()
    expect(screen.getByText('Stop eerst om te bewerken')).toBeInTheDocument()
  })

  it('knop met het toetsenbord indrukken en loslaten tijdens het draaien', () => {
    const press = vi.fn()
    const start = benchReducer(initialBench, { type: 'add', kind: 'button', x: 100, y: 100 })
    render(<Wrapper locked start={start} onPartPress={press} />)
    fireEvent.keyDown(items()[0], { key: ' ' })
    expect(press).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'button' }), true)
    fireEvent.keyUp(items()[0], { key: ' ' })
    expect(press).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'button' }), false)
  })

  it('loslaten met Spatie werkt ook nadat het programma is gestopt (knop blijft niet hangen)', () => {
    const press = vi.fn()
    const start = benchReducer(initialBench, { type: 'add', kind: 'button', x: 100, y: 100 })
    const { rerender } = render(<Wrapper locked start={start} onPartPress={press} />)
    fireEvent.keyDown(items()[0], { key: ' ' })
    rerender(<Wrapper locked={false} start={start} onPartPress={press} />)
    fireEvent.keyUp(items()[0], { key: ' ' })
    expect(press).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'button' }), false)
  })

  it('temperatuur- en potmeterschuifje melden hun waarde (in °C en in procenten)', () => {
    const onChange = vi.fn()
    const start = benchReducer(benchReducer(initialBench, { type: 'add', kind: 'temperature', x: 100, y: 100 }), { type: 'add', kind: 'potentiometer', x: 200, y: 100 })
    render(<Bench3D parts={start.parts} connecting={null} error={null} locked={false} dispatch={() => {}} sensors={{ values: { 'part-1': 25, 'part-2': 0.5 }, onChange }} />)
    const t = screen.getByLabelText('Temperatuur') as HTMLInputElement
    expect(t.value).toBe('25')
    fireEvent.change(t, { target: { value: '30' } })
    expect(onChange).toHaveBeenCalledWith(start.parts[0], 30)
    expect(screen.getByText('25 °C')).toBeInTheDocument()
    const p = screen.getByLabelText('Stand van de potmeter') as HTMLInputElement
    expect(p.value).toBe('50')
    fireEvent.change(p, { target: { value: '80' } })
    expect(onChange).toHaveBeenCalledWith(start.parts[1], 0.8)
  })

  it('de lijst toont de live staat: led aan/uit, buzzer actief, knop ingedrukt', () => {
    let s = initialBench
    for (const kind of ['led', 'buzzer', 'button'] as PartKind[]) s = benchReducer(s, { type: 'add', kind, x: 100, y: 100 })
    render(
      <Bench3D parts={s.parts} connecting={null} error={null} locked dispatch={() => {}}
        live={(p) => (p.kind === 'button' ? { pressed: true } : { level: 1 })} />,
    )
    const [led, buzzer, button] = items()
    expect(led).toHaveAttribute('data-glow', 'on')
    expect(buzzer).toHaveAttribute('data-active', 'true')
    expect(button).toHaveAttribute('data-pressed', 'true')
  })
})
