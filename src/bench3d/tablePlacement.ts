import { Plane, Raycaster, Vector2, Vector3, type Camera, type Ray } from 'three'
import { BOARD_POS, VIEW_H, VIEW_W } from '../bench/partGeometry'
import { MM, PI_BOARD, TABLE } from './geometry'

const G = TABLE.gridSvg

/** Zone rond de Pi waar geen onderdelen vastklikken (de Pi zelf plus een marge van 5 mm). */
export const PI_ZONE = {
  x0: BOARD_POS.x - 5 * MM, x1: BOARD_POS.x + PI_BOARD.width * MM + 5 * MM,
  y0: BOARD_POS.y - 5 * MM, y1: BOARD_POS.y + PI_BOARD.depth * MM + 5 * MM,
}
/** Onderdelen op minder dan 10 mm van elkaar overlappen. */
export const MIN_SPACING = 10 * MM

/** Rastercellen binnen de tafel (met een rand van ruim 4 mm), gemeten in werkbankeenheden. */
const COLS = { min: 2, max: Math.floor((VIEW_W - 40) / G) }
const ROWS = { min: 2, max: Math.floor((VIEW_H - 60) / G) }

export const insidePiZone = (x: number, y: number) => x > PI_ZONE.x0 && x < PI_ZONE.x1 && y > PI_ZONE.y0 && y < PI_ZONE.y1

/** Alle plekken waar een onderdeel mag staan: op het raster, op de tafel en naast de Pi. */
export const ALLOWED_CELLS: readonly { x: number; y: number }[] = (() => {
  const out: { x: number; y: number }[] = []
  for (let c = COLS.min; c <= COLS.max; c++) for (let r = ROWS.min; r <= ROWS.max; r++) {
    const x = c * G, y = r * G
    if (!insidePiZone(x, y)) out.push({ x, y })
  }
  return out
})()

/**
 * Dichtstbijzijnde vrije rasterplek naast de Pi (in werkbankeenheden). Plekken dicht bij een ander onderdeel (`others`) vallen af;
 * is de tafel vol, dan geldt de dichtstbijzijnde plek zonder die eis.
 */
export function placeOnTable(x: number, y: number, others: readonly { x: number; y: number }[] = []): { x: number; y: number } {
  let best: { x: number; y: number } | null = null
  let bestAny: { x: number; y: number } | null = null
  let dBest = Infinity, dAny = Infinity
  for (const c of ALLOWED_CELLS) {
    const d = (c.x - x) ** 2 + (c.y - y) ** 2
    if (d < dAny) { dAny = d; bestAny = c }
    if (d < dBest && !others.some((o) => Math.hypot(o.x - c.x, o.y - c.y) < MIN_SPACING)) { dBest = d; best = c }
  }
  return best ?? bestAny!
}

const plane = new Plane(new Vector3(0, 1, 0), 0)

/** Waar een straal (bijv. van de muis) het tafelvlak raakt, in wereldcoördinaten. */
export function rayToTable(ray: Ray): { x: number; z: number } | null {
  const hit = ray.intersectPlane(plane, new Vector3())
  return hit ? { x: hit.x, z: hit.z } : null
}

/** Idem, vanuit genormaliseerde schermcoördinaten (−1..1) en een camera. */
export function ndcToTable(ndc: { x: number; y: number }, camera: Camera): { x: number; z: number } | null {
  const rc = new Raycaster()
  rc.setFromCamera(new Vector2(ndc.x, ndc.y), camera)
  return rayToTable(rc.ray)
}
