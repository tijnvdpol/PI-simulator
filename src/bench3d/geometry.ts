/**
 * Maten en coördinaten van de 3D-werkbank. Eenheid in de wereld: millimeter.
 * Assen (three.js): x = rechts, y = omhoog (tafel op y = 0), z = naar de kijker toe.
 *
 * `Part.x` en `Part.y` blijven in "werkbankeenheden" (de oude SVG-coördinaten) opgeslagen, zodat bestaande
 * projecten niet migreren: 1 mm = 8 eenheden, het midden van de tafel is de oorsprong van de wereld.
 */
import { BOARD_POS, VIEW_H, VIEW_W } from '../bench/partGeometry'

export const MM = 8
export const PITCH = 2.54

/** Raspberry Pi 4/5 volgens de officiële maattekening. u = van links, v = van de bovenrand (lange zijde met de header). */
export const PI_BOARD = {
  width: 85,
  depth: 56,
  thickness: 1.4,
  cornerRadius: 3,
  /** Montagegaten: 58 × 49 mm, 3,5 mm van de randen. */
  holes: [
    { u: 3.5, v: 3.5 }, { u: 61.5, v: 3.5 }, { u: 3.5, v: 52.5 }, { u: 61.5, v: 52.5 },
  ],
} as const

/** 2×20-header: gecentreerd tussen de montagegaten, middenlijn op dezelfde afstand van de rand als de gaten. */
export const HEADER = {
  columns: 20,
  centerV: 3.5,
  firstU: (PI_BOARD.holes[0].u + PI_BOARD.holes[1].u) / 2 - (19 * PITCH) / 2,
  /** Zwart plastic huis. */
  bodyHeight: 2.5,
  /** Hoogte van de pinpunt boven de printplaat. */
  pinTop: 8.5,
  pinSize: 0.64,
} as const

export const TABLE = {
  svgW: VIEW_W,
  svgH: VIEW_H,
  /** Rastermaat (4 mm) in werkbankeenheden. */
  gridSvg: 4 * MM,
} as const

/** Pinpositie op de printplaat in mm. Even pinnen = buitenste rij (aan de rand), oneven = binnenrij. */
export function pinBoardMm(physical: number): { u: number; v: number } {
  const col = Math.floor((physical - 1) / 2)
  const outer = physical % 2 === 0
  return { u: HEADER.firstU + col * PITCH, v: HEADER.centerV + (outer ? -PITCH / 2 : PITCH / 2) }
}

export function svgToWorld(sx: number, sy: number): { x: number; z: number } {
  return { x: (sx - TABLE.svgW / 2) / MM, z: (sy - TABLE.svgH / 2) / MM }
}

export function worldToSvg(x: number, z: number): { x: number; y: number } {
  return { x: x * MM + TABLE.svgW / 2, y: z * MM + TABLE.svgH / 2 }
}

/** Linkerbovenhoek van de Pi in wereldcoördinaten (de Pi staat op dezelfde plek als in de 2D-opstelling). */
export const PI_ORIGIN = svgToWorld(BOARD_POS.x, BOARD_POS.y)

/** Van printplaat-mm naar wereld op het bovenvlak van de printplaat. */
export function boardToWorld(u: number, v: number, height: number = PI_BOARD.thickness) {
  return { x: PI_ORIGIN.x + u, y: height, z: PI_ORIGIN.z + v }
}

/** Waar een draad aan een pin vastzit: de punt van de pin. */
export function pinWorld(physical: number): { x: number; y: number; z: number } {
  const { u, v } = pinBoardMm(physical)
  return boardToWorld(u, v, PI_BOARD.thickness + HEADER.pinTop)
}

/** Zet een onderdeel op het raster (in werkbankeenheden). */
export function snapSvg(x: number, y: number): { x: number; y: number } {
  const g = TABLE.gridSvg
  const snap = (v: number) => Math.round(v / g) * g + 0
  return { x: snap(x), y: snap(y) }
}
