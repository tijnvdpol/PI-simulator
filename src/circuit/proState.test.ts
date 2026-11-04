import { describe, expect, it } from 'vitest'
import { initialPro, proReducer, type ProAction, type ProState } from './proState'

const run = (actions: ProAction[], from: ProState = initialPro): ProState => actions.reduce(proReducer, from)
const led = { type: 'add', kind: 'led', col: 5, row: 1, rot: 0 } as const

describe('onderdelen plaatsen', () => {
  it('voegt een onderdeel toe met een eigen id', () => {
    const s = run([led, { type: 'add', kind: 'led', col: 9, row: 1, rot: 0 }])
    expect(s.present.parts.map((p) => p.id)).toEqual(['p1', 'p2'])
    expect(s.present.parts[0].color).toBe('red')
  })
  it('een weerstand krijgt 330 Ω', () => {
    expect(run([{ type: 'add', kind: 'resistor', col: 3, row: 0, rot: 0 }]).present.parts[0].resistance).toBe(330)
  })
  it('weigert een plek buiten het bord of een bezet gaatje, met een melding', () => {
    const off = run([{ type: 'add', kind: 'led', col: 30, row: 1, rot: 0 }])
    expect(off.present.parts).toHaveLength(0)
    expect(off.error).toMatch(/past daar niet/)
    const taken = run([led, { type: 'add', kind: 'led', col: 6, row: 1, rot: 0 }])
    expect(taken.present.parts).toHaveLength(1)
    expect(taken.error).toBeTruthy()
  })
  it('verplaatsen, draaien, verwijderen', () => {
    let s = run([led])
    s = run([{ type: 'move', id: 'p1', col: 10, row: 3, rot: 1 }], s)
    expect(s.present.parts[0]).toMatchObject({ col: 10, row: 3, rot: 1 })
    s = run([{ type: 'rotate', id: 'p1' }], s)
    expect(s.present.parts[0].rot).toBe(2)
    s = run([{ type: 'remove', id: 'p1' }], s)
    expect(s.present.parts).toEqual([])
  })
  it('een verplaatsing naar een bezette plek wordt geweigerd', () => {
    const s = run([led, { type: 'add', kind: 'led', col: 9, row: 1, rot: 0 }, { type: 'move', id: 'p2', col: 5, row: 1, rot: 0 }])
    expect(s.present.parts[1].col).toBe(9)
    expect(s.error).toBeTruthy()
  })
  it('weerstandswaarde en ledkleur', () => {
    const s = run([{ type: 'add', kind: 'resistor', col: 3, row: 0, rot: 0 }, { type: 'setResistance', id: 'p1', ohm: 1000 }])
    expect(s.present.parts[0].resistance).toBe(1000)
    const l = run([led, { type: 'setColor', id: 'p1', color: 'blue' }])
    expect(l.present.parts[0].color).toBe('blue')
  })
})

describe('draden', () => {
  it('klik op een pin en dan een gaatje maakt een draad', () => {
    let s = run([{ type: 'clickTerminal', terminal: 'pin:11' }])
    expect(s.pending).toBe('pin:11')
    s = run([{ type: 'clickTerminal', terminal: 'h:a5' }], s)
    expect(s.pending).toBeNull()
    expect(s.present.wires).toHaveLength(1)
    expect(s.present.wires[0]).toMatchObject({ id: 'w1', a: 'pin:11', b: 'h:a5' })
  })
  it('standaardkleuren: rood voor stroom, zwart voor GND, anders een signaalkleur', () => {
    const wire = (a: string, b: string) => run([{ type: 'addWire', a, b }]).present.wires[0].color
    expect(wire('pin:1', 'h:a1')).toBe('red')
    expect(wire('pin:2', 'h:a1')).toBe('red')
    expect(wire('pin:6', 'h:a1')).toBe('black')
    expect(wire('h:a1', 'r:t+:1')).toBe('red')
    expect(wire('h:a1', 'r:b-:3')).toBe('black')
    expect(['blue', 'green', 'yellow', 'orange', 'purple']).toContain(wire('pin:11', 'h:a1'))
  })
  it('een gekozen kleur wint', () => {
    const s = run([{ type: 'setWireColor', color: 'purple' }, { type: 'addWire', a: 'pin:1', b: 'h:a1' }])
    expect(s.present.wires[0].color).toBe('purple')
  })
  it('opnieuw op hetzelfde punt klikken, Esc en dubbele draden', () => {
    let s = run([{ type: 'clickTerminal', terminal: 'pin:11' }, { type: 'clickTerminal', terminal: 'pin:11' }])
    expect(s.pending).toBeNull()
    s = run([{ type: 'addWire', a: 'pin:11', b: 'h:a1' }, { type: 'addWire', a: 'h:a1', b: 'pin:11' }])
    expect(s.present.wires).toHaveLength(1)
    s = run([{ type: 'clickTerminal', terminal: 'pin:11' }, { type: 'cancelWire' }])
    expect(s.pending).toBeNull()
  })
  it('weigert onbekende aansluitpunten en draad naar jezelf', () => {
    expect(run([{ type: 'addWire', a: 'pin:11', b: 'bogus' }]).present.wires).toHaveLength(0)
    expect(run([{ type: 'addWire', a: 'pin:11', b: 'pin:11' }]).present.wires).toHaveLength(0)
  })
  it('een draad verwijderen', () => {
    const s = run([{ type: 'addWire', a: 'pin:11', b: 'h:a1' }, { type: 'removeWire', id: 'w1' }])
    expect(s.present.wires).toEqual([])
  })
})

describe('ongedaan maken en opnieuw', () => {
  it('undo en redo', () => {
    let s = run([led, { type: 'addWire', a: 'pin:11', b: 'h:a1' }])
    s = run([{ type: 'undo' }], s)
    expect(s.present.wires).toHaveLength(0)
    expect(s.present.parts).toHaveLength(1)
    s = run([{ type: 'undo' }], s)
    expect(s.present.parts).toHaveLength(0)
    s = run([{ type: 'undo' }], s) // niets meer
    expect(s.present.parts).toHaveLength(0)
    s = run([{ type: 'redo' }, { type: 'redo' }], s)
    expect(s.present.parts).toHaveLength(1)
    expect(s.present.wires).toHaveLength(1)
  })
  it('een nieuwe actie wist de redo-lijst', () => {
    let s = run([led, { type: 'undo' }])
    expect(s.future).toHaveLength(1)
    s = run([{ type: 'add', kind: 'led', col: 2, row: 2, rot: 0 }], s)
    expect(s.future).toHaveLength(0)
  })
  it('een mislukte actie komt niet in de geschiedenis', () => {
    const s = run([led, { type: 'add', kind: 'led', col: 5, row: 1, rot: 0 }])
    expect(s.past).toHaveLength(1)
  })
  it('de geschiedenis is begrensd', () => {
    let s = initialPro
    for (let i = 0; i < 150; i++) s = proReducer(s, { type: 'addWire', a: `h:a${(i % 30) + 1}`, b: `h:b${((i + 1) % 30) + 1}` })
    expect(s.past.length).toBeLessThanOrEqual(100)
  })
  it('load wist de geschiedenis', () => {
    const s = run([led, { type: 'load', circuit: { parts: [], wires: [] } }])
    expect(s.past).toEqual([])
    expect(s.present.parts).toEqual([])
  })
  it('doorbranden en vervangen horen niet bij de geschiedenis', () => {
    let s = run([led])
    s = run([{ type: 'burn', ids: ['p1'] }], s)
    expect(s.burnt).toEqual(['p1'])
    expect(s.past).toHaveLength(1)
    s = run([{ type: 'undo' }], s)
    expect(s.burnt).toEqual([]) // het onderdeel bestaat niet meer
    s = run([led, { type: 'burn', ids: ['p1'] }, { type: 'replace', id: 'p1' }])
    expect(s.burnt).toEqual([])
  })
  it('een onderdeel verwijderen haalt het uit de doorgebrande lijst', () => {
    const s = run([led, { type: 'burn', ids: ['p1'] }, { type: 'remove', id: 'p1' }])
    expect(s.burnt).toEqual([])
  })
})

describe('draadkleur wijzigen', () => {
  it('past de kleur aan en is ongedaan te maken', () => {
    let s = run([{ type: 'addWire', a: 'pin:11', b: 'h:a1', color: 'blue' }, { type: 'recolorWire', id: 'w1', color: 'orange' }])
    expect(s.present.wires[0].color).toBe('orange')
    s = run([{ type: 'undo' }], s)
    expect(s.present.wires[0].color).toBe('blue')
    expect(run([{ type: 'recolorWire', id: 'nope', color: 'red' }]).past).toHaveLength(0)
  })
})
