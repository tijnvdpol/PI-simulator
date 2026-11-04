import { PerspectiveCamera, Ray, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { BOARD_POS } from '../bench/partGeometry'
import { TABLE } from './geometry'
import { ALLOWED_CELLS, MIN_SPACING, PI_ZONE, insidePiZone, ndcToTable, placeOnTable, rayToTable } from './tablePlacement'

describe('raster naast de Pi', () => {
  it('alle toegestane plekken liggen op het raster en niet op of vlak naast de Pi', () => {
    expect(ALLOWED_CELLS.length).toBeGreaterThan(100)
    for (const c of ALLOWED_CELLS) {
      expect(c.x % TABLE.gridSvg).toBe(0)
      expect(c.y % TABLE.gridSvg).toBe(0)
      expect(insidePiZone(c.x, c.y)).toBe(false)
    }
  })

  it('de zone omvat de hele Pi', () => {
    expect(PI_ZONE.x0).toBeLessThan(BOARD_POS.x)
    expect(PI_ZONE.y0).toBeLessThan(BOARD_POS.y)
    expect(insidePiZone(BOARD_POS.x + 340, BOARD_POS.y + 200)).toBe(true)
  })

  it('een punt naast de Pi klikt vast op de dichtstbijzijnde rasterplek', () => {
    const r = placeOnTable(101, 77)
    expect(r.x % TABLE.gridSvg).toBe(0)
    expect(r.y % TABLE.gridSvg).toBe(0)
    expect(Math.hypot(r.x - 101, r.y - 77)).toBeLessThanOrEqual(TABLE.gridSvg)
  })

  it('een punt op de Pi wordt naar de rand ervan geduwd, nooit op de Pi gezet', () => {
    for (const [x, y] of [[450, 450], [200, 300], [700, 260], [BOARD_POS.x + 5, BOARD_POS.y + 5]]) {
      const r = placeOnTable(x, y)
      expect(insidePiZone(r.x, r.y), `${x},${y}`).toBe(false)
    }
  })

  it('is stabiel: nogmaals vastklikken verandert niets', () => {
    for (const [x, y] of [[0, 0], [123, 456], [900, 700], [450, 100], [-50, 900]]) {
      const r = placeOnTable(x, y)
      expect(placeOnTable(r.x, r.y)).toEqual(r)
    }
  })

  it('blijft binnen de tafel, ook bij punten ver buiten het beeld', () => {
    for (const [x, y] of [[-1000, -1000], [5000, 5000], [900, 0], [0, 700]]) {
      const r = placeOnTable(x, y)
      expect(r.x).toBeGreaterThanOrEqual(40); expect(r.x).toBeLessThanOrEqual(860)
      expect(r.y).toBeGreaterThanOrEqual(40); expect(r.y).toBeLessThanOrEqual(640)
    }
  })

  it('onderdelen overlappen elkaar niet: een bezette plek schuift door naar een vrije', () => {
    const a = placeOnTable(200, 120)
    const b = placeOnTable(200, 120, [a])
    expect(b).not.toEqual(a)
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThanOrEqual(MIN_SPACING)
  })

  it('is de tafel vol, dan geldt de dichtstbijzijnde plek toch (er blijft altijd een antwoord)', () => {
    const full = ALLOWED_CELLS.map((c) => ({ x: c.x, y: c.y }))
    const r = placeOnTable(200, 120, full)
    expect(insidePiZone(r.x, r.y)).toBe(false)
  })
})

describe('muis → tafel', () => {
  it('een straal recht naar beneden raakt de tafel op de juiste plek', () => {
    const hit = rayToTable(new Ray(new Vector3(12, 50, -7), new Vector3(0, -1, 0)))!
    expect(hit.x).toBeCloseTo(12, 9); expect(hit.z).toBeCloseTo(-7, 9)
  })
  it('een straal die omhoog of horizontaal gaat raakt niets', () => {
    expect(rayToTable(new Ray(new Vector3(0, 5, 0), new Vector3(0, 1, 0)))).toBeNull()
    expect(rayToTable(new Ray(new Vector3(0, 5, 0), new Vector3(1, 0, 0)))).toBeNull()
  })
  it('midden van het scherm met een camera van boven geeft het kijkpunt', () => {
    const cam = new PerspectiveCamera(40, 1.5, 1, 600)
    cam.position.set(5, 100, 0.001); cam.lookAt(5, 0, 0); cam.updateMatrixWorld(true)
    const hit = ndcToTable({ x: 0, y: 0 }, cam)!
    expect(hit.x).toBeCloseTo(5, 2); expect(hit.z).toBeCloseTo(0, 2)
    expect(ndcToTable({ x: 1, y: 0 }, cam)!.x).toBeGreaterThan(5)
  })
  it('een punt boven de horizon geeft null', () => {
    const cam = new PerspectiveCamera(40, 1.5, 1, 600)
    cam.position.set(0, 20, 60); cam.lookAt(0, 0, 0); cam.updateMatrixWorld(true)
    expect(ndcToTable({ x: 0, y: 1 }, cam)).toBeNull()
  })
})
