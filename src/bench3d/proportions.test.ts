import { describe, expect, it } from 'vitest'
import { BB_SIZE, P, holeXZ, railXZ } from './pro/layout'
import { PI_BOARD } from './geometry'
import { LED, ledEpoxyGeometry, resistorBodyGeometry } from './models/shapes'

describe('verhoudingen in ware grootte (mm)', () => {
  it('Pi 85 × 56 mm; led 5 mm; weerstand 6,3 mm lang; breadboard half formaat', () => {
    expect(PI_BOARD.width).toBe(85)
    expect(PI_BOARD.depth).toBe(56)
    const led = ledEpoxyGeometry(); led.computeBoundingBox()
    expect(led.boundingBox!.max.x - led.boundingBox!.min.x).toBeCloseTo(5, 1)
    expect(LED.flange * 2).toBeCloseTo(5.8, 1)
    const r = resistorBodyGeometry(); r.computeBoundingBox()
    expect(r.boundingBox!.max.x - r.boundingBox!.min.x).toBeCloseTo(6.3, 2)
    // 30 kolommen met 2,54 mm steek passen op een bord van ~82 mm met ruimte voor de letters
    expect((holeXZ(30, 0).x - holeXZ(1, 0).x) / P).toBeCloseTo(29, 6)
    expect(BB_SIZE.w).toBeGreaterThan(29 * P + 6)
    expect(BB_SIZE.w).toBeLessThan(90)
  })

  it('de led past tussen twee buurgaatjes (5 mm koepel op 2,54 mm steek: poten in naastliggende gaten)', () => {
    expect(2 * LED.radius).toBeGreaterThan(P) // de koepel is breder dan de steek, de poten zitten dus 1 gat uit elkaar
    expect(railXZ('t+', 1).z).toBeLessThan(holeXZ(1, 0).z)
  })
})
