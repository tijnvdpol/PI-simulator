import { describe, expect, it } from 'vitest'
import { benchReducer, selectableTargets, type BenchState } from './benchState'

const empty: BenchState = { parts: [], connecting: null, error: null }

const withLed = () => benchReducer(empty, { type: 'add', kind: 'led', x: 10, y: 20 })

describe('benchReducer', () => {
  it('add maakt een led zonder verbinding met standaardkleur rood', () => {
    const s = withLed()
    expect(s.parts).toHaveLength(1)
    expect(s.parts[0]).toMatchObject({ kind: 'led', x: 10, y: 20, color: 'red', connections: {} })
  })
  it('add geeft unieke ids, ook na verwijderen', () => {
    let s = withLed()
    s = benchReducer(s, { type: 'add', kind: 'button', x: 0, y: 0 })
    s = benchReducer(s, { type: 'remove', id: s.parts[0].id })
    s = benchReducer(s, { type: 'add', kind: 'buzzer', x: 0, y: 0 })
    expect(new Set(s.parts.map((p) => p.id)).size).toBe(2)
  })
  it('beginConnect + connect zet de verbinding en wist connecting', () => {
    let s = withLed()
    const id = s.parts[0].id
    s = benchReducer(s, { type: 'beginConnect', id })
    expect(s.connecting).toBe(id)
    s = benchReducer(s, { type: 'connect', id, target: { type: 'pin', physical: 11 } })
    expect(s.parts[0].connections.signal).toEqual({ type: 'pin', physical: 11 })
    expect(s.connecting).toBeNull()
    expect(s.error).toBeNull()
  })
  it('bezette GPIO-pin → error "al in gebruik" en geen wijziging', () => {
    let s = withLed()
    s = benchReducer(s, { type: 'add', kind: 'button', x: 0, y: 0 })
    const [a, b] = s.parts
    s = benchReducer(s, { type: 'connect', id: a.id, target: { type: 'pin', physical: 11 } })
    const before = s.parts
    s = benchReducer(s, { type: 'connect', id: b.id, target: { type: 'pin', physical: 11 } })
    expect(s.error).toContain('al in gebruik')
    expect(s.parts).toEqual(before)
  })
  it('meerdere onderdelen op GND is toegestaan', () => {
    let s = withLed()
    s = benchReducer(s, { type: 'add', kind: 'button', x: 0, y: 0 })
    for (const p of s.parts) s = benchReducer(s, { type: 'connect', id: p.id, target: { type: 'pin', physical: 6 } })
    expect(s.error).toBeNull()
    expect(s.parts.every((p) => p.connections.signal?.type === 'pin')).toBe(true)
  })
  it('ID-pinnen (27, 28) worden geweigerd', () => {
    const s0 = withLed()
    const s = benchReducer(s0, { type: 'connect', id: s0.parts[0].id, target: { type: 'pin', physical: 27 } })
    expect(s.parts[0].connections.signal).toBeUndefined()
  })
  it('verkeerd soort doel (led op ADC-kanaal) wordt genegeerd', () => {
    const s0 = withLed()
    const s = benchReducer(s0, { type: 'connect', id: s0.parts[0].id, target: { type: 'adc', channel: 0 } })
    expect(s.parts[0].connections.signal).toBeUndefined()
  })
  it('ongeldig kanaal 9 wordt genegeerd', () => {
    let s = benchReducer(empty, { type: 'add', kind: 'potentiometer', x: 0, y: 0 })
    s = benchReducer(s, { type: 'connect', id: s.parts[0].id, target: { type: 'adc', channel: 9 } })
    expect(s.parts[0].connections.signal).toBeUndefined()
  })
  it('twee analoge onderdelen op hetzelfde kanaal → error', () => {
    let s = benchReducer(empty, { type: 'add', kind: 'potentiometer', x: 0, y: 0 })
    s = benchReducer(s, { type: 'add', kind: 'temperature', x: 0, y: 0 })
    s = benchReducer(s, { type: 'connect', id: s.parts[0].id, target: { type: 'adc', channel: 2 } })
    s = benchReducer(s, { type: 'connect', id: s.parts[1].id, target: { type: 'adc', channel: 2 } })
    expect(s.error).toContain('al in gebruik')
  })
  it('remove maakt de pin vrij en wist connecting', () => {
    let s = withLed()
    const id = s.parts[0].id
    s = benchReducer(s, { type: 'connect', id, target: { type: 'pin', physical: 11 } })
    s = benchReducer(s, { type: 'beginConnect', id })
    s = benchReducer(s, { type: 'remove', id })
    expect(s.parts).toEqual([])
    expect(s.connecting).toBeNull()
  })
  it('move, setColor, cancelConnect en load', () => {
    let s = withLed()
    const id = s.parts[0].id
    s = benchReducer(s, { type: 'move', id, x: 99, y: 98 })
    s = benchReducer(s, { type: 'setColor', id, color: 'blue' })
    expect(s.parts[0]).toMatchObject({ x: 99, y: 98, color: 'blue' })
    s = benchReducer(s, { type: 'beginConnect', id })
    s = benchReducer(s, { type: 'cancelConnect' })
    expect(s.connecting).toBeNull()
    s = benchReducer(s, { type: 'load', parts: [] })
    expect(s.parts).toEqual([])
  })
})

describe('selectableTargets', () => {
  it('led: 26 GPIO + 4 voeding + 8 GND, geen ID-pinnen, geen kanalen', () => {
    const s = withLed()
    const t = selectableTargets(s, s.parts[0].id)
    expect(t.pins).toHaveLength(38)
    expect(t.pins).not.toContain(27)
    expect(t.pins).not.toContain(28)
    expect(t.channels).toEqual([])
  })
  it('bezette GPIO-pin is niet selecteerbaar voor een ander onderdeel, wel voor zichzelf', () => {
    let s = withLed()
    s = benchReducer(s, { type: 'add', kind: 'button', x: 0, y: 0 })
    s = benchReducer(s, { type: 'connect', id: s.parts[0].id, target: { type: 'pin', physical: 11 } })
    expect(selectableTargets(s, s.parts[1].id).pins).not.toContain(11)
    expect(selectableTargets(s, s.parts[0].id).pins).toContain(11)
  })
  it('potmeter: alleen kanalen 0–7', () => {
    const s = benchReducer(empty, { type: 'add', kind: 'potentiometer', x: 0, y: 0 })
    const t = selectableTargets(s, s.parts[0].id)
    expect(t.pins).toEqual([])
    expect(t.channels).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })
})

const addPart = (s: BenchState, kind: Parameters<typeof benchReducer>[1] extends infer A ? (A extends { type: 'add'; kind: infer K } ? K : never) : never) =>
  benchReducer(s, { type: 'add', kind, x: 0, y: 0 })
const connect = (s: BenchState, id: string, terminal: string, physical: number) =>
  benchReducer(s, { type: 'connect', id, terminal, target: { type: 'pin', physical } })

describe('onderdelen met meerdere aansluitingen', () => {
  it('add: nieuwe onderdelen beginnen zonder aansluitingen; dimbare led heeft een kleur, RGB niet', () => {
    let s = addPart(empty, 'pwmled'); s = addPart(s, 'rgbled'); s = addPart(s, 'servo')
    expect(s.parts.map((p) => p.connections)).toEqual([{}, {}, {}])
    expect(s.parts[0].color).toBe('red')
    expect(s.parts[1].color).toBeUndefined()
  })
  it('connect zet precies één terminal; zonder terminal geldt de eerste', () => {
    let s = addPart(empty, 'servo')
    const id = s.parts[0].id
    s = connect(s, id, 'v5', 2)
    expect(s.parts[0].connections).toEqual({ v5: { type: 'pin', physical: 2 } })
    s = benchReducer(s, { type: 'connect', id, target: { type: 'pin', physical: 12 } })
    expect(s.parts[0].connections.signal).toEqual({ type: 'pin', physical: 12 })
  })
  it('OLED SDA op een gewone GPIO-pin → uitleg met wat er nodig is en waarom, niets gewijzigd', () => {
    let s = addPart(empty, 'oled')
    s = connect(s, s.parts[0].id, 'sda', 11)
    expect(s.parts[0].connections).toEqual({})
    expect(s.error).toContain('SDA')
    expect(s.error).toContain('pin 3 (GPIO 2)')
    expect(s.error).toContain('I²C')
  })
  it('servo-voeding op een 3V3-pin wordt geweigerd met uitleg over 5V', () => {
    let s = addPart(empty, 'servo')
    s = connect(s, s.parts[0].id, 'v5', 1)
    expect(s.parts[0].connections).toEqual({})
    expect(s.error).toContain('5V')
  })
  it('een GPIO-pin kan niet voor twee terminals van hetzelfde onderdeel (R en G)', () => {
    let s = addPart(empty, 'rgbled')
    const id = s.parts[0].id
    s = connect(s, id, 'r', 11)
    s = connect(s, id, 'g', 11)
    expect(s.error).toContain('al in gebruik')
    expect(s.parts[0].connections.g).toBeUndefined()
  })
  it('voeding en GND mogen gedeeld worden door meerdere onderdelen', () => {
    let s = addPart(empty, 'servo'); s = addPart(s, 'rgbled')
    s = connect(s, s.parts[0].id, 'gnd', 6); s = connect(s, s.parts[1].id, 'gnd', 6)
    expect(s.error).toBeNull()
    expect(s.parts.map((p) => p.connections.gnd)).toEqual([{ type: 'pin', physical: 6 }, { type: 'pin', physical: 6 }])
  })
  it('een tweede OLED kan niet: de I²C-pinnen zijn al bezet', () => {
    let s = addPart(empty, 'oled'); s = addPart(s, 'oled')
    s = connect(s, s.parts[0].id, 'sda', 3); s = connect(s, s.parts[1].id, 'sda', 3)
    expect(s.error).toContain('al in gebruik')
  })
  it('disconnect haalt één aansluiting weg', () => {
    let s = addPart(empty, 'servo')
    const id = s.parts[0].id
    s = connect(s, id, 'v5', 2); s = connect(s, id, 'gnd', 6)
    s = benchReducer(s, { type: 'disconnect', id, terminal: 'v5' })
    expect(Object.keys(s.parts[0].connections)).toEqual(['gnd'])
  })
  it('autoConnect sluit alle lege aansluitingen aan op de voorgestelde pinnen en laat bestaande staan', () => {
    let s = addPart(empty, 'oled')
    const id = s.parts[0].id
    s = connect(s, id, 'gnd', 14)
    s = benchReducer(s, { type: 'autoConnect', id })
    expect(s.parts[0].connections).toEqual({
      sda: { type: 'pin', physical: 3 }, scl: { type: 'pin', physical: 5 }, v33: { type: 'pin', physical: 1 }, gnd: { type: 'pin', physical: 14 },
    })
  })
  it('autoConnect ontwijkt bezette pinnen', () => {
    let s = addPart(empty, 'led'); s = addPart(s, 'rgbled')
    s = connect(s, s.parts[0].id, 'signal', 11)
    s = benchReducer(s, { type: 'autoConnect', id: s.parts[1].id })
    const c = s.parts[1].connections
    expect(c.r).not.toEqual({ type: 'pin', physical: 11 })
    expect(Object.keys(c).sort()).toEqual(['b', 'g', 'gnd', 'r'])
    const gpios = [c.r, c.g, c.b].map((x) => (x as { physical: number }).physical)
    expect(new Set([...gpios, 11]).size).toBe(4)
  })
})

describe('selectableTargets per terminal', () => {
  it('OLED SDA: alleen pin 3, voorgesteld; de rest heeft een reden', () => {
    const s = addPart(empty, 'oled')
    const t = selectableTargets(s, s.parts[0].id, 'sda')
    expect(t.pins).toEqual([3])
    expect(t.suggested).toEqual([3])
    expect(t.reasons[11]).toContain('SDA')
  })
  it('servo 5V: alleen de twee 5V-pinnen', () => {
    const s = addPart(empty, 'servo')
    expect(selectableTargets(s, s.parts[0].id, 'v5').pins).toEqual([2, 4])
  })
  it('servo-signaal: alle 26 GPIO-pinnen, voorstel pin 12; bezette pinnen krijgen een reden', () => {
    let s = addPart(empty, 'led'); s = addPart(s, 'servo')
    s = connect(s, s.parts[0].id, 'signal', 12)
    const t = selectableTargets(s, s.parts[1].id, 'signal')
    expect(t.pins).toHaveLength(25)
    expect(t.pins).not.toContain(12)
    expect(t.suggested[0]).not.toBe(12)
    expect(t.reasons[12]).toContain('in gebruik')
  })
  it('GND voor de RGB-led: alle 8 GND-pinnen, ook als een ander onderdeel er al op zit', () => {
    let s = addPart(empty, 'servo'); s = addPart(s, 'rgbled')
    s = connect(s, s.parts[0].id, 'gnd', 6)
    expect(selectableTargets(s, s.parts[1].id, 'gnd').pins).toHaveLength(8)
  })
})
