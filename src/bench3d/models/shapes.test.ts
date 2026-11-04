import { describe, expect, it } from 'vitest'
import { LED, ledEpoxyGeometry, ledFlangeGeometry, legGeometry, resistorBodyGeometry, ribbedKnobGeometry, to92Geometry } from './shapes'

const box = (g: { computeBoundingBox: () => void; boundingBox: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } } | null }) => { g.computeBoundingBox(); return g.boundingBox! }

describe('onderdeelvormen (mm)', () => {
  it('led: 5 mm doorsnede, koepel bovenop, flens van 5,8 mm met een platte kathodekant (+x)', () => {
    const e = box(ledEpoxyGeometry())
    expect(e.max.x - e.min.x).toBeCloseTo(5, 1)
    expect(e.max.y).toBeCloseTo(LED.body + LED.radius, 3)
    const f = box(ledFlangeGeometry(2.35))
    expect(f.max.x).toBeCloseTo(2.35, 3)      // vlakke kant
    expect(-f.min.x).toBeCloseTo(LED.flange, 2) // ronde kant
    expect(f.max.y - f.min.y).toBeCloseTo(LED.flangeThick, 3)
    expect(f.min.y).toBeCloseTo(0, 3)
  })

  it('weerstand: lichaam van 6,3 mm lengte langs x, dikker aan de uiteinden', () => {
    const b = box(resistorBodyGeometry())
    expect(b.max.x - b.min.x).toBeCloseTo(6.3, 3)
    expect(b.max.y - b.min.y).toBeGreaterThan(2.4)
  })

  it('TO-92: vlakke voorkant naar +z, halve cilinder erachter', () => {
    const b = box(to92Geometry(2.5, 4.5))
    expect(b.max.z).toBeLessThan(1)       // vlak
    expect(b.min.z).toBeLessThan(-2)      // rondte achter
    expect(b.max.y - b.min.y).toBeGreaterThan(4.5)
  })

  it('draaiknop: geribbeld, blijft binnen de straal', () => {
    const g = ribbedKnobGeometry(5.5, 4, 18)
    const b = box(g)
    expect(b.max.x).toBeLessThanOrEqual(5.5 + 1e-6)
    expect(b.max.x).toBeGreaterThan(5)
  })

  it('pootje: een buisje door alle punten', () => {
    const g = legGeometry([[0, 0, 0], [0, 5, 0], [0.5, 8, 0], [0, 10, 0]], 0.28)
    const b = box(g)
    expect(b.min.y).toBeLessThan(0.1)
    expect(b.max.y).toBeGreaterThan(9.8)
  })
})
