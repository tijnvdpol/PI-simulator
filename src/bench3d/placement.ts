// Zuivere plaatsing op het raster, bewust zonder `three`, zodat de app dit kan gebruiken zonder de 3D-bibliotheek te laden.
import { BOARD_POS, CHIP, VIEW_H, VIEW_W } from '../bench/partGeometry'
import { MM, PI_BOARD, TABLE } from './geometry'

const G = TABLE.gridSvg

/** Zone rond de Pi waar geen onderdelen vastklikken (de Pi zelf plus een marge van 5 mm). */
export const PI_ZONE = {
  x0: BOARD_POS.x - 5 * MM, x1: BOARD_POS.x + PI_BOARD.width * MM + 5 * MM,
  y0: BOARD_POS.y - 5 * MM, y1: BOARD_POS.y + PI_BOARD.depth * MM + 5 * MM,
}
/** Zone rond de MCP3008-chip (met een marge van 4 mm), zodat er niets bovenop de chip wordt gezet. */
export const CHIP_ZONE = { x0: CHIP.x - 4 * MM, x1: CHIP.x + CHIP.w + 4 * MM, y0: CHIP.y - 4 * MM, y1: CHIP.y + CHIP.h + 4 * MM }
/** Onderdelen op minder dan 10 mm van elkaar overlappen. */
export const MIN_SPACING = 10 * MM

/** Rastercellen binnen de tafel (met een rand van ruim 4 mm), gemeten in werkbankeenheden. */
const COLS = { min: 2, max: Math.floor((VIEW_W - 40) / G) }
const ROWS = { min: 2, max: Math.floor((VIEW_H - 60) / G) }

const inside = (z: { x0: number; x1: number; y0: number; y1: number }, x: number, y: number) => x > z.x0 && x < z.x1 && y > z.y0 && y < z.y1
export const insidePiZone = (x: number, y: number) => inside(PI_ZONE, x, y)
export const insideChipZone = (x: number, y: number) => inside(CHIP_ZONE, x, y)
/** Verboden terrein: op de Pi of op de chip. */
export const forbidden = (x: number, y: number) => insidePiZone(x, y) || insideChipZone(x, y)

/** Alle plekken waar een onderdeel mag staan: op het raster, op de tafel en naast de Pi en de chip. */
export const ALLOWED_CELLS: readonly { x: number; y: number }[] = (() => {
  const out: { x: number; y: number }[] = []
  for (let c = COLS.min; c <= COLS.max; c++) for (let r = ROWS.min; r <= ROWS.max; r++) {
    const x = c * G, y = r * G
    if (!forbidden(x, y)) out.push({ x, y })
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
