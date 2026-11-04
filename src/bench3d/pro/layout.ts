/**
 * Maten en plekken van het breadboard in de 3D-werkbank (mm). Zuivere functies, zonder three.
 * Assen: x = rechts, y = omhoog (tafel op 0), z = naar de kijker toe. Het breadboard ligt achter de Pi.
 */
import { COLS, RAIL_LEN, parseTerminal, type RailName } from '../../circuit/breadboard'
import { fits, legPlaces } from '../../circuit/parts'
import type { ProKind, Rot } from '../../circuit/types'
import { pinWorld } from '../geometry'

export const P = 2.54
export const BB_CENTER = { x: 0, z: -50 }
export const BB_TOP = 8.5
export const BB_SIZE = { w: 82, d: 58 }
/** De MCP3008-module met 8 kanaalaansluitingen, rechts van het breadboard. */
export const MCP_CENTER = { x: 70, z: -50 }
export const MCP_TOP = 6
export const MCP_SIZE = { w: 16, d: 46 }
export const CH_PITCH = 5.08

/** Tafel in de pro-modus: groter dan de simpele tafel, zodat Pi, breadboard en module erop passen. */
export const PRO_TABLE = { width: 170, depth: 150, cx: 15, cz: -20 }

export interface XYZ { x: number; y: number; z: number }

const rowZ = (row: number) => (row - 4.5) * P + (row < 5 ? -P : P)
const colX = (col: number) => (col - 15.5) * P

const RAIL_Z: Record<RailName, number> = { 't+': -24.6, 't-': -22.0, 'b-': 22.0, 'b+': 24.6 }
/** Railgaten staan in groepen van 5 met een extra tussenruimte. */
const railX = (index: number) => (index - 1) * P + Math.floor((index - 1) / 5) * P - (24 * P + 4 * P) / 2

export const holeXZ = (col: number, row: number) => ({ x: BB_CENTER.x + colX(col), z: BB_CENTER.z + rowZ(row) })
export const railXZ = (rail: RailName, index: number) => ({ x: BB_CENTER.x + railX(index), z: BB_CENTER.z + RAIL_Z[rail] })
export const adcXYZ = (channel: number): XYZ => ({ x: MCP_CENTER.x, y: MCP_TOP, z: MCP_CENTER.z + (channel - 3.5) * CH_PITCH })

/** Plek van een aansluitpunt, in wereldcoördinaten (bovenkant van het gaatje of de punt van de pin). */
export function terminalWorld(id: string): XYZ | null {
  const t = parseTerminal(id)
  if (!t) return null
  switch (t.type) {
    case 'pin': return pinWorld(t.physical)
    case 'hole': return { ...holeXZ(t.col, t.row), y: BB_TOP }
    case 'rail': return { ...railXZ(t.rail, t.index), y: BB_TOP }
    case 'adc': return adcXYZ(t.channel)
  }
}

export interface Anchor { col: number; row: number }

/** Het midden van de poten van een onderdeel op de tafel. */
export function partCenter(part: { kind: ProKind; col: number; row: number; rot: Rot }): { x: number; z: number } {
  const places = legPlaces(part).map((l) => holeXZ(l.col, l.row))
  return { x: places.reduce((s, p) => s + p.x, 0) / places.length, z: places.reduce((s, p) => s + p.z, 0) / places.length }
}

/** Het ankergat waarbij het onderdeel (met deze draaiing) het dichtst bij een punt op de tafel staat, of null als niets past. */
export function anchorForPoint(kind: ProKind, rot: Rot, x: number, z: number): Anchor | null {
  let best: Anchor | null = null
  let bestD = Infinity
  for (let col = 1; col <= COLS; col++) for (let row = 0; row < 10; row++) {
    const cand = { kind, col, row, rot }
    if (!fits(cand)) continue
    const c = partCenter(cand)
    const d = (c.x - x) ** 2 + (c.z - z) ** 2
    if (d < bestD) { bestD = d; best = { col, row } }
  }
  // Te ver van het bord af: niet vastklikken.
  return best && bestD < 12 ** 2 ? best : null
}

export { RAIL_LEN }
