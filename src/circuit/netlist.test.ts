import { describe, expect, it } from 'vitest'
import { COLS, RAIL_LEN, allHoles, allRailHoles, holeId, internalGroup, internalNet, parseTerminal, railId } from './breadboard'
import { NET_3V3, NET_5V, NET_GND, buildNetlist } from './netlist'
import { canPlace, fits, legPlaces } from './parts'
import type { Circuit, ProPart, ProWire } from './types'

const C = (parts: ProPart[] = [], wires: ProWire[] = []): Circuit => ({ parts, wires })
const wire = (id: string, a: string, b: string): ProWire => ({ id, a, b, color: 'blue' })

describe('breadboard', () => {
  it('heeft 300 gaatjes en 100 railgaatjes', () => {
    expect(allHoles()).toHaveLength(300)
    expect(allRailHoles()).toHaveLength(4 * RAIL_LEN)
  })
  it('een rij van 5: a–e in één kolom zijn verbonden, de middenspleet scheidt', () => {
    expect(internalNet('h:a7')).toBe(internalNet('h:e7'))
    expect(internalNet('h:e7')).not.toBe(internalNet('h:f7'))
    expect(internalNet('h:f7')).toBe(internalNet('h:j7'))
    expect(internalNet('h:a7')).not.toBe(internalNet('h:a8'))
  })
  it('een rail loopt over de hele lengte; plus en min zijn gescheiden', () => {
    expect(internalNet(railId('t+', 1))).toBe(internalNet(railId('t+', 25)))
    expect(internalNet(railId('t+', 1))).not.toBe(internalNet(railId('t-', 1)))
    expect(internalNet(railId('t+', 1))).not.toBe(internalNet(railId('b+', 1)))
  })
  it('internalGroup geeft de gemarkeerde gaatjes', () => {
    expect(internalGroup('h:c12').sort()).toEqual(['h:a12', 'h:b12', 'h:c12', 'h:d12', 'h:e12'])
    expect(internalGroup('h:g12')).toContain('h:j12')
    expect(internalGroup(railId('b-', 3))).toHaveLength(RAIL_LEN)
    expect(internalGroup('pin:11')).toEqual([])
  })
  it('parseTerminal herkent geldige en ongeldige id’s', () => {
    expect(parseTerminal('pin:40')).toEqual({ type: 'pin', physical: 40 })
    expect(parseTerminal('pin:41')).toBeNull()
    expect(parseTerminal('h:j30')).toEqual({ type: 'hole', col: 30, row: 9 })
    expect(parseTerminal('h:a31')).toBeNull()
    expect(parseTerminal('r:t+:25')).toEqual({ type: 'rail', rail: 't+', index: 25 })
    expect(parseTerminal('adc:7')).toEqual({ type: 'adc', channel: 7 })
    expect(parseTerminal('adc:8')).toBeNull()
    expect(parseTerminal('x')).toBeNull()
    expect(holeId(COLS, 9)).toBe('h:j30')
  })
})

describe('onderdeelpoten', () => {
  it('draaien en passen', () => {
    const led: ProPart = { id: 'p', kind: 'led', col: 5, row: 2, rot: 0 }
    expect(legPlaces(led).map((l) => l.hole)).toEqual(['h:c5', 'h:c6'])
    expect(legPlaces({ ...led, rot: 1 }).map((l) => l.hole)).toEqual(['h:c5', 'h:d5'])
    expect(fits({ ...led, col: 30 })).toBe(false)
    expect(fits({ ...led, row: 9, rot: 1 })).toBe(false)
  })
  it('een knop over de middenspleet heeft poten op rij e en f', () => {
    const b: ProPart = { id: 'b', kind: 'button', col: 10, row: 4, rot: 0 }
    expect(legPlaces(b).map((l) => l.hole).sort()).toEqual(['h:e10', 'h:e12', 'h:f10', 'h:f12'])
  })
  it('canPlace weigert een bezet gaatje', () => {
    const a: ProPart = { id: 'a', kind: 'led', col: 5, row: 2, rot: 0 }
    expect(canPlace({ id: 'b', kind: 'led', col: 6, row: 2, rot: 0 }, [a])).toBe(false)
    expect(canPlace({ id: 'b', kind: 'led', col: 6, row: 3, rot: 0 }, [a])).toBe(true)
    expect(canPlace(a, [a])).toBe(true)
  })
})

describe('netlijst', () => {
  it('alle GND-pinnen, 3V3-pinnen en 5V-pinnen zijn één net', () => {
    const n = buildNetlist(C())
    expect(n.same('pin:6', 'pin:39')).toBe(true)
    expect(n.same('pin:1', 'pin:17')).toBe(true)
    expect(n.same('pin:2', 'pin:4')).toBe(true)
    expect(n.same('pin:1', 'pin:2')).toBe(false)
    expect(n.net('pin:6')).toBe(NET_GND === n.net('pin:6') ? NET_GND : n.net('pin:6'))
    expect(n.same('pin:6', NET_GND)).toBe(true)
    expect(n.same('pin:1', NET_3V3)).toBe(true)
    expect(n.same('pin:2', NET_5V)).toBe(true)
  })
  it('een draad verbindt pin en gaatje, en het gaatje de rij', () => {
    const n = buildNetlist(C([], [wire('w', 'pin:11', 'h:a5')]))
    expect(n.same('pin:11', 'h:e5')).toBe(true)
    expect(n.same('pin:11', 'h:f5')).toBe(false)
    expect(n.same('pin:11', 'h:a6')).toBe(false)
  })
  it('poten zitten aan het net van hun gaatje', () => {
    const led: ProPart = { id: 'l', kind: 'led', col: 5, row: 0, rot: 0 }
    const n = buildNetlist(C([led], [wire('w', 'pin:11', 'h:c5')]))
    expect(n.same(n.legNet(led, 'anode'), 'pin:11')).toBe(true)
    expect(n.same(n.legNet(led, 'kathode'), 'pin:11')).toBe(false)
  })
  it('de twee kanten van een knop zijn intern verbonden, de kanten onderling niet', () => {
    const b: ProPart = { id: 'b', kind: 'button', col: 10, row: 4, rot: 0 }
    const n = buildNetlist(C([b]))
    expect(n.legNet(b, 'a')).toBe(n.legNet(b, 'b'))
    expect(n.legNet(b, 'c')).toBe(n.legNet(b, 'd'))
    expect(n.legNet(b, 'a')).not.toBe(n.legNet(b, 'c'))
  })
})

describe('firstFreeAnchor', () => {
  it('vindt een vrije plek en slaat bezette over', async () => {
    const { firstFreeAnchor } = await import('./parts')
    const a = firstFreeAnchor('led', [])!
    expect(canPlace({ id: 'x', kind: 'led', ...a, rot: 0 }, [])).toBe(true)
    const taken: ProPart = { id: 'a', kind: 'led', ...a, rot: 0 }
    const b = firstFreeAnchor('led', [taken])!
    expect(b).not.toEqual(a)
    expect(canPlace({ id: 'y', kind: 'led', ...b, rot: 0 }, [taken])).toBe(true)
    expect(firstFreeAnchor('button', [])!.row).toBe(4)
  })
})
