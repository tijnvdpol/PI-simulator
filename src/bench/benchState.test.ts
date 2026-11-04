import { describe, expect, it } from 'vitest'
import { benchReducer, selectableTargets, type BenchState } from './benchState'

const empty: BenchState = { parts: [], connecting: null, error: null }

const withLed = () => benchReducer(empty, { type: 'add', kind: 'led', x: 10, y: 20 })

describe('benchReducer', () => {
  it('add maakt een led zonder verbinding met standaardkleur rood', () => {
    const s = withLed()
    expect(s.parts).toHaveLength(1)
    expect(s.parts[0]).toMatchObject({ kind: 'led', x: 10, y: 20, color: 'red', connection: null })
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
    expect(s.parts[0].connection).toEqual({ type: 'pin', physical: 11 })
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
    expect(s.parts.every((p) => p.connection?.type === 'pin')).toBe(true)
  })
  it('ID-pinnen (27, 28) worden geweigerd', () => {
    const s0 = withLed()
    const s = benchReducer(s0, { type: 'connect', id: s0.parts[0].id, target: { type: 'pin', physical: 27 } })
    expect(s.parts[0].connection).toBeNull()
  })
  it('verkeerd soort doel (led op ADC-kanaal) wordt genegeerd', () => {
    const s0 = withLed()
    const s = benchReducer(s0, { type: 'connect', id: s0.parts[0].id, target: { type: 'adc', channel: 0 } })
    expect(s.parts[0].connection).toBeNull()
  })
  it('ongeldig kanaal 9 wordt genegeerd', () => {
    let s = benchReducer(empty, { type: 'add', kind: 'potentiometer', x: 0, y: 0 })
    s = benchReducer(s, { type: 'connect', id: s.parts[0].id, target: { type: 'adc', channel: 9 } })
    expect(s.parts[0].connection).toBeNull()
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
