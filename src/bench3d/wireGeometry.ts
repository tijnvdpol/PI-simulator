import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three'
import type { Part } from '../project/types'
import type { Wire } from '../bench/wires'
import { CHIP_CENTER, PART_ANCHORS, chipChannelLocal, chipLabelLocal, type V3 } from './anchors'
import { pinWorld, svgToWorld } from './geometry'

export const WIRE_RADIUS = 0.5

export interface WireEnds { a: V3; b: V3 }

/** Waar een onderdeel op de tafel staat (voet van het onderdeel). */
export const partWorld = (p: Part): V3 => {
  const { x, z } = svgToWorld(p.x, p.y)
  return [x, 0, z]
}

const add = (o: V3, d: V3): V3 => [o[0] + d[0], o[1] + d[1], o[2] + d[2]]

/** Begin- en eindpunt van een draad in wereldcoördinaten (mm), of null als het onderdeel niet (meer) bestaat. */
export function wireEnds(w: Wire, parts: Part[]): WireEnds | null {
  let a: V3
  if ('part' in w.from) {
    const id = w.from.part
    const part = parts.find((p) => p.id === id)
    if (!part) return null
    const anchors = PART_ANCHORS[part.kind]
    a = add(partWorld(part), (w.kind === 'ground' ? anchors.ground : undefined) ?? anchors.signal)
  } else {
    a = add([CHIP_CENTER.x, 0, CHIP_CENTER.z], chipLabelLocal(w.label ?? 'VDD'))
  }
  let b: V3
  if ('physical' in w.to) {
    const p = pinWorld(w.to.physical)
    b = [p.x, p.y, p.z]
  } else {
    b = add([CHIP_CENTER.x, 0, CHIP_CENTER.z], chipChannelLocal(w.to.channel))
  }
  return { a, b }
}

/**
 * Vloeiende boog tussen twee punten: de draad gaat eerst omhoog, over de top en dan omlaag naar het eindpunt.
 * `lane` (0, 1, 2, …) tilt de boog iets hoger, zodat draden naast elkaar niet door elkaar heen lopen.
 */
export function wireCurve({ a, b }: WireEnds, lane = 0): CatmullRomCurve3 {
  const dist = Math.hypot(b[0] - a[0], b[2] - a[2])
  const top = Math.max(a[1], b[1]) + Math.min(28, 6 + 0.3 * dist) + (lane % 4) * 1.6
  const A = new Vector3(...a)
  const B = new Vector3(...b)
  return new CatmullRomCurve3(
    [
      A,
      new Vector3(a[0], a[1] + 3, a[2]),
      new Vector3((a[0] + b[0]) / 2, top, (a[2] + b[2]) / 2),
      new Vector3(b[0], b[1] + 3, b[2]),
      B,
    ],
    false,
    'centripetal',
  )
}

export function wireGeometry(ends: WireEnds, lane = 0): TubeGeometry {
  return new TubeGeometry(wireCurve(ends, lane), 28, WIRE_RADIUS, 6, false)
}
