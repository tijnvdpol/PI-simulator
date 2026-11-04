import { describe, expect, it } from 'vitest'
import { PINS } from '../../pinout/pinout'
import { BB_TOP, P, anchorForPoint, holeXZ, partCenter, railXZ, terminalWorld } from './layout'

describe('breadboard-indeling', () => {
  it('gaatjes staan 2,54 mm uit elkaar; de middenspleet is 7,62 mm', () => {
    expect(holeXZ(6, 0).x - holeXZ(5, 0).x).toBeCloseTo(P)
    expect(holeXZ(5, 1).z - holeXZ(5, 0).z).toBeCloseTo(P)
    expect(holeXZ(5, 5).z - holeXZ(5, 4).z).toBeCloseTo(7.62)
  })
  it('het bord is symmetrisch om zijn midden', () => {
    expect(holeXZ(1, 0).x).toBeCloseTo(-holeXZ(30, 0).x)
    expect(holeXZ(1, 0).z).toBeCloseTo(-50 - (holeXZ(1, 9).z + 50))
  })
  it('rails staan buiten de gaatjes en hebben ruimte tussen de groepen van 5', () => {
    expect(railXZ('t+', 1).z).toBeLessThan(holeXZ(1, 0).z)
    expect(railXZ('b+', 1).z).toBeGreaterThan(holeXZ(1, 9).z)
    expect(railXZ('t+', 6).x - railXZ('t+', 5).x).toBeCloseTo(2 * P)
    expect(railXZ('t+', 25).x).toBeCloseTo(-railXZ('t+', 1).x)
  })
  it('terminalWorld geeft een plek voor alle soorten aansluitpunten', () => {
    expect(terminalWorld('h:a1')!.y).toBe(BB_TOP)
    expect(terminalWorld('r:b+:25')).toBeTruthy()
    expect(terminalWorld('adc:7')).toBeTruthy()
    expect(terminalWorld('pin:40')).toBeTruthy()
    expect(terminalWorld('x')).toBeNull()
    // elke pin van de Pi heeft een plek
    for (const p of PINS) expect(terminalWorld(`pin:${p.physical}`)).not.toBeNull()
  })
  it('anchorForPoint vindt het ankergat onder een punt', () => {
    const c = partCenter({ kind: 'led', col: 8, row: 2, rot: 0 })
    expect(anchorForPoint('led', 0, c.x, c.z)).toEqual({ col: 8, row: 2 })
    expect(anchorForPoint('led', 0, c.x + 0.3, c.z - 0.2)).toEqual({ col: 8, row: 2 })
  })
  it('anchorForPoint houdt rekening met draaiing en randen', () => {
    const c = partCenter({ kind: 'resistor', col: 10, row: 3, rot: 1 })
    expect(anchorForPoint('resistor', 1, c.x, c.z)).toEqual({ col: 10, row: 3 })
    expect(anchorForPoint('led', 0, 500, 500)).toBeNull()
  })
})
