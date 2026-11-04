// @vitest-environment jsdom
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { useReducer } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { analyze } from '../../circuit/analyze'
import { initialPro, proReducer, type ProAction, type ProState } from '../../circuit/proState'
import { emptyCircuit, type Circuit, type ProPart } from '../../circuit/types'
import { BOARD_TERMINALS, holeMarks } from './Breadboard'
import { ProScene, type ProSceneProps } from './ProScene'

vi.mock('@react-three/fiber', async (orig) => ({ ...(await orig<typeof import('@react-three/fiber')>()), Canvas: () => null }))
const { default: ProBench3D } = await import('./ProBench3D')

const circuit: Circuit = {
  parts: [
    { id: 'p1', kind: 'resistor', col: 5, row: 0, rot: 0, resistance: 330 },
    { id: 'p2', kind: 'led', col: 9, row: 1, rot: 0, color: 'red' },
    { id: 'p3', kind: 'button', col: 14, row: 4, rot: 0 },
    { id: 'p4', kind: 'potentiometer', col: 20, row: 6, rot: 0 },
  ],
  wires: [{ id: 'w1', a: 'pin:11', b: 'h:b5', color: 'blue' }, { id: 'w2', a: 'h:c10', b: 'pin:6', color: 'black' }],
}

const sceneProps = (over: Partial<ProSceneProps> = {}): ProSceneProps => ({
  circuit: emptyCircuit(), live: () => ({}), selectedPartId: null, selectedWireId: null, pending: null, marks: new Map(), preview: null,
  burns: [], onBurnDone: () => {}, onTerminalHover: () => {}, onTerminalClick: () => {}, onWireSelect: () => {},
  projectRef: { current: null }, view: null, ...over,
})

describe('holeMarks', () => {
  it('hover markeert het hele interne net, pending valt extra op, het spookbeeld wint', () => {
    const m = holeMarks({ hover: 'h:c7', pending: 'h:a7', ghost: null, used: new Set() })
    expect(['h:a7', 'h:b7', 'h:c7', 'h:d7', 'h:e7'].map((id) => m.get(id))).toEqual(['pending', 'hover', 'hover', 'hover', 'hover'])
    expect(m.get('h:f7')).toBeUndefined()
    const g = holeMarks({ hover: 'h:c7', pending: null, ghost: { holes: ['h:c7'], ok: false }, used: new Set(['h:a1']) })
    expect(g.get('h:c7')).toBe('bad')
    expect(g.get('h:a1')).toBe('used')
  })
  it('een railgaatje markeert de hele rail', () => {
    expect([...holeMarks({ hover: 'r:t+:3', pending: null, ghost: null, used: new Set() }).keys()]).toHaveLength(25)
  })
})

describe('ProScene', () => {
  it('toont tafel, Pi, breadboard met 400 instanced gaatjes en de MCP3008-module met 8 aansluitingen', async () => {
    const r = await ReactThreeTestRenderer.create(<ProScene {...sceneProps()} />)
    const root = r.scene.instance
    expect(root.getObjectByName('table')).toBeTruthy()
    expect(root.getObjectByName('pi-board')).toBeTruthy()
    expect(root.getObjectByName('breadboard')).toBeTruthy()
    expect((root.getObjectByName('holes') as unknown as { count: number }).count).toBe(400)
    expect(BOARD_TERMINALS).toHaveLength(400)
    expect((root.getObjectByName('adc-sockets') as unknown as { count: number }).count).toBe(8)
  })
  it('toont onderdelen met kleurringen en draden', async () => {
    const r = await ReactThreeTestRenderer.create(<ProScene {...sceneProps({ circuit })} />)
    const root = r.scene.instance
    for (const id of ['p1', 'p2', 'p3', 'p4']) expect(root.getObjectByName(`part-${id}`)).toBeTruthy()
    expect(root.getObjectByName('resistor')!.userData.bands).toEqual(['orange', 'orange', 'brown', 'gold'])
    expect(root.getObjectByName('wire-w1')).toBeTruthy()
    expect(root.getObjectByName('wire-w2')).toBeTruthy()
  })
  it('led: gloed bij stroom, zwart na doorbranden', async () => {
    const mk = (live: ProSceneProps['live']) => <ProScene {...sceneProps({ circuit, live })} />
    const r = await ReactThreeTestRenderer.create(mk((p) => (p.id === 'p2' ? { level: 0.8 } : {})))
    expect(r.scene.instance.getObjectByName('led')!.userData.glow).toBe('on')
    await r.update(mk((p) => (p.id === 'p2' ? { burnt: true, level: 0.8 } : {})))
    expect(r.scene.instance.getObjectByName('led')!.userData).toMatchObject({ glow: 'off', burnt: true })
  })
  it('knop toont ingedrukt, selectie krijgt een ring, rook verschijnt bij een doorgebrande led', async () => {
    const r = await ReactThreeTestRenderer.create(<ProScene {...sceneProps({ circuit, selectedPartId: 'p3', live: (p) => (p.id === 'p3' ? { pressed: true } : {}), burns: [{ key: 'k', x: 0, z: -50 }] })} />)
    const root = r.scene.instance
    expect(root.getObjectByName('button')!.userData.pressed).toBe(true)
    expect(root.getObjectByName('part-p3')!.getObjectByName('selection')).toBeTruthy()
    expect(root.getObjectByName('burn-effect')).toBeTruthy()
  })
  it('voorbeelddraad tijdens het maken van een draad', async () => {
    const r = await ReactThreeTestRenderer.create(<ProScene {...sceneProps({ pending: 'pin:11', preview: { a: 'pin:11', b: 'h:a5' } })} />)
    expect(r.scene.instance.getObjectByName('wire-preview')).toBeTruthy()
  })
})

function Harness({ locked = false, start = initialPro, burnt = [] as string[], spy }: { locked?: boolean; start?: ProState; burnt?: string[]; spy?: (a: ProAction) => void }) {
  const [s, dispatch] = useReducer((st: ProState, a: ProAction) => { spy?.(a); return proReducer(st, a) }, start)
  return (
    <ProBench3D
      circuit={s.present} pending={s.pending} error={s.error} wireColor={s.wireColor} canUndo={s.past.length > 0} canRedo={s.future.length > 0}
      burnt={burnt.length ? burnt : s.burnt} dispatch={dispatch} locked={locked} result={analyze(s.present)}
      sensors={{ values: {}, onChange: () => {} }} pressed={{}} onPress={() => {}}
    />
  )
}
const withParts = (parts: ProPart[], wires = circuit.wires): ProState => ({ ...initialPro, present: { parts, wires } })

describe('ProBench3D (HTML-kant)', () => {
  it('lijst met onderdelen: selecteren toont de eigenschappen; weerstandswaarde en ledkleur aanpasbaar', () => {
    render(<Harness start={withParts(circuit.parts)} />)
    const list = screen.getByRole('list', { name: 'Onderdelen op het breadboard' })
    fireEvent.click(within(list).getByRole('button', { name: /weerstand/ }))
    const panel = screen.getByRole('complementary', { name: /Eigenschappen van weerstand/ })
    fireEvent.change(within(panel).getByLabelText('Waarde'), { target: { value: '1000' } })
    expect(screen.getByRole('complementary', { name: /weerstand/ })).toHaveTextContent('1 kΩ')
    fireEvent.click(within(list).getByRole('button', { name: /led/ }))
    fireEvent.change(screen.getByLabelText('Kleur'), { target: { value: 'green' } })
    expect((screen.getByLabelText('Kleur') as HTMLSelectElement).value).toBe('green')
  })
  it('Ctrl+Z en Ctrl+Y maken ongedaan en opnieuw; Delete verwijdert het geselecteerde onderdeel; R draait', () => {
    const seen: string[] = []
    render(<Harness start={withParts(circuit.parts)} spy={(a) => seen.push(a.type)} />)
    fireEvent.click(within(screen.getByRole('list', { name: 'Onderdelen op het breadboard' })).getByRole('button', { name: /led/ }))
    fireEvent.keyDown(window, { key: 'r' })
    fireEvent.keyDown(window, { key: 'Delete' })
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true })
    expect(seen).toEqual(['rotate', 'remove', 'undo', 'redo'])
  })
  it('sneltoetsen doen niets terwijl je in een invoerveld typt', () => {
    const seen: string[] = []
    render(<Harness start={withParts(circuit.parts)} spy={(a) => seen.push(a.type)} />)
    const input = document.createElement('input')
    document.body.appendChild(input)
    fireEvent.keyDown(input, { key: 'z', ctrlKey: true })
    expect(seen).toEqual([])
    input.remove()
  })
  it('de knoppen Ongedaan en Opnieuw staan uit als er niets te doen is', () => {
    render(<Harness />)
    expect(screen.getByRole('button', { name: /Ongedaan/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Opnieuw/ })).toBeDisabled()
  })
  it('een kleur kiezen voor nieuwe draden', () => {
    const seen: ProAction[] = []
    render(<Harness spy={(a) => seen.push(a)} />)
    fireEvent.click(screen.getByRole('button', { name: 'paars' }))
    expect(seen).toContainEqual({ type: 'setWireColor', color: 'purple' })
  })
  it('tijdens het draaien is bouwen vergrendeld, maar de knop is nog te bedienen', () => {
    const presses: boolean[] = []
    function L() {
      return (
        <ProBench3D
          circuit={circuit} pending={null} error={null} wireColor="auto" canUndo canRedo={false} burnt={[]} dispatch={() => {}} locked
          result={analyze(circuit)} sensors={{ values: {}, onChange: () => {} }} pressed={{}} onPress={(_id, down) => presses.push(down)}
        />
      )
    }
    render(<L />)
    expect(screen.getByRole('button', { name: /Ongedaan/ })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent(/draait/)
    const b = screen.getByRole('button', { name: 'Druk op knop p3' })
    fireEvent.pointerDown(b); fireEvent.pointerUp(b)
    expect(presses).toEqual([true, false])
  })
  it('meldingen uit de analyse verschijnen, en een doorgebrande led kan vervangen worden', () => {
    const noR: Circuit = { parts: [circuit.parts[1]], wires: [{ id: 'w1', a: 'pin:11', b: 'h:c9', color: 'blue' }, { id: 'w2', a: 'h:c10', b: 'pin:6', color: 'black' }] }
    const seen: ProAction[] = []
    function W() {
      return (
        <ProBench3D
          circuit={noR} pending={null} error={null} wireColor="auto" canUndo={false} canRedo={false} burnt={['p2']} dispatch={(a) => seen.push(a)} locked={false}
          result={analyze(noR, { gpio: { 17: { mode: 'out', level: 1 } } })} sensors={{ values: {}, onChange: () => {} }} pressed={{}} onPress={() => {}}
        />
      )
    }
    render(<W />)
    expect(screen.getByRole('list', { name: /Meldingen/ })).toHaveTextContent(/doorgebrand/)
    fireEvent.click(within(screen.getByRole('list', { name: 'Onderdelen op het breadboard' })).getByRole('button', { name: /led/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Vervang led' }))
    expect(seen).toContainEqual({ type: 'replace', id: 'p2' })
  })
  it('sleep vanuit de bak toont geen spook zonder gesleept onderdeel (geen crash)', () => {
    const { container } = render(<Harness />)
    const target = container.querySelector('[data-testid="bench"]')!
    act(() => { fireEvent.dragOver(target, { dataTransfer: { types: [] } }) })
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
