import { describe, expect, it } from 'vitest'
import { BOARD_POS } from '../bench/partGeometry'
import { PINS } from '../pinout/pinout'
import { HEADER, MM, PI_BOARD, PITCH, TABLE, pinBoardMm, pinWorld, snapSvg, svgToWorld, worldToSvg } from './geometry'

describe('Pi-maten (officiële maattekening Pi 4/5)', () => {
  it('printplaat is 85 × 56 mm', () => {
    expect(PI_BOARD.width).toBe(85)
    expect(PI_BOARD.depth).toBe(56)
  })
  it('de steek is 2,54 mm en 1 mm = 8 werkbankeenheden (dezelfde schaal als de 2D-opstelling)', () => {
    expect(PITCH).toBe(2.54)
    expect(MM).toBe(8)
  })
  it('de header zit gecentreerd tussen de montagegaten (58 mm uit elkaar) en op de lijn van de gaten', () => {
    const [a, b] = PI_BOARD.holes
    expect(b.u - a.u).toBe(58)
    const first = pinBoardMm(1), last = pinBoardMm(39)
    expect((first.u + last.u) / 2).toBeCloseTo((a.u + b.u) / 2, 6)
    expect(HEADER.centerV).toBeCloseTo(PI_BOARD.holes[0].v, 6)
  })
})

describe('pinposities in 3D', () => {
  const all = PINS.map((p) => ({ n: p.physical, ...pinWorld(p.physical) }))

  it('er zijn 40 pinnen, elk met een unieke positie', () => {
    expect(all).toHaveLength(40)
    const keys = new Set(all.map((p) => `${p.x.toFixed(3)},${p.z.toFixed(3)}`))
    expect(keys.size).toBe(40)
  })

  it('alle pinnen liggen op de printplaat', () => {
    for (const p of PINS) {
      const { u, v } = pinBoardMm(p.physical)
      expect(u).toBeGreaterThan(0); expect(u).toBeLessThan(PI_BOARD.width)
      expect(v).toBeGreaterThan(0); expect(v).toBeLessThan(PI_BOARD.depth)
    }
  })

  it('pin n en n+1 (oneven/even) zitten in dezelfde kolom, 2,54 mm uit elkaar; even = buitenste rij', () => {
    for (let n = 1; n <= 39; n += 2) {
      const odd = pinBoardMm(n), even = pinBoardMm(n + 1)
      expect(even.u).toBeCloseTo(odd.u, 6)
      expect(odd.v - even.v).toBeCloseTo(PITCH, 6)
    }
  })

  it('opeenvolgende kolommen liggen 2,54 mm uit elkaar, pin 1 het meest links', () => {
    for (let n = 1; n <= 37; n++) expect(pinBoardMm(n + 2).u - pinBoardMm(n).u).toBeCloseTo(PITCH, 6)
    expect(Math.min(...PINS.map((p) => pinBoardMm(p.physical).u))).toBeCloseTo(pinBoardMm(1).u, 6)
  })

  it('past bij de pinout: 5V linksboven (pin 2 en 4), 3V3 op pin 1 en 17, GND op de bekende plekken', () => {
    const kind = (n: number) => PINS[n - 1].kind
    expect(kind(2)).toBe('5v'); expect(kind(4)).toBe('5v')
    expect(pinBoardMm(2).u).toBeLessThan(pinBoardMm(6).u)
    expect(pinBoardMm(4).v).toBe(pinBoardMm(2).v)
    expect(PINS.filter((p) => p.kind === 'gnd').map((p) => p.physical)).toEqual([6, 9, 14, 20, 25, 30, 34, 39])
    expect(PINS.filter((p) => p.kind === '3v3').map((p) => p.physical)).toEqual([1, 17])
    // GPIO 17 = pin 11 = zesde kolom, binnenrij
    expect(PINS[10].gpio).toBe(17)
    expect(pinBoardMm(11).u).toBeCloseTo(pinBoardMm(1).u + 5 * PITCH, 6)
    expect(pinBoardMm(11).v).toBeCloseTo(pinBoardMm(1).v, 6)
  })

  it('pinnen steken boven de printplaat uit', () => {
    for (const p of all) expect(p.y).toBeGreaterThan(PI_BOARD.thickness)
  })
})

describe('werkbankcoördinaten', () => {
  it('de tafel is gecentreerd rond de oorsprong en de Pi staat op de plek van BOARD_POS', () => {
    expect(svgToWorld(TABLE.svgW / 2, TABLE.svgH / 2)).toEqual({ x: 0, z: 0 })
    const corner = svgToWorld(BOARD_POS.x, BOARD_POS.y)
    expect(corner.x).toBeCloseTo(-PI_BOARD.width / 2, 6)
  })
  it('svg ↔ wereld is omkeerbaar', () => {
    for (const [x, y] of [[0, 0], [123, 456], [900, 700], [450.5, 17.25]]) {
      const w = svgToWorld(x, y)
      const back = worldToSvg(w.x, w.z)
      expect(back.x).toBeCloseTo(x, 6); expect(back.y).toBeCloseTo(y, 6)
    }
  })
  it('snap zet onderdelen op het raster', () => {
    const s = snapSvg(101, 77)
    expect(s.x % TABLE.gridSvg).toBeCloseTo(0, 6)
    expect(s.y % TABLE.gridSvg).toBeCloseTo(0, 6)
    expect(Math.abs(s.x - 101)).toBeLessThanOrEqual(TABLE.gridSvg / 2)
    expect(snapSvg(s.x, s.y)).toEqual(s)
  })
})
