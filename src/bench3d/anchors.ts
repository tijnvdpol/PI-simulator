import type { PartKind } from '../project/types'
import { CHIP } from '../bench/partGeometry'
import { svgToWorld } from './geometry'

export type V3 = readonly [number, number, number]

/** Waar de draden aan een onderdeel vastzitten, in mm ten opzichte van het midden van het onderdeel op de tafel. */
export const PART_ANCHORS: Record<PartKind, { signal: V3; ground?: V3 }> = {
  led: { signal: [-1.27, 2, 0], ground: [1.27, 2, 0] },          // lang pootje = plus
  button: { signal: [-3.25, 1, 0], ground: [3.25, 1, 0] },
  buzzer: { signal: [-3.8, 2, 0], ground: [3.8, 2, 0] },
  temperature: { signal: [0, 2, 0] },                              // middelste pootje = uitgang
  potentiometer: { signal: [0, 2, 0] },                            // middelste pootje = sleper
}

/** MCP3008 (DIP-16): pin 1 linksboven, tegen de klok in. De chip staat op de plek van de 2D-chip. */
export const CHIP_CENTER = svgToWorld(CHIP.x + CHIP.w / 2, CHIP.y + CHIP.h / 2)
export const CHIP_DIM = { length: 19.3, width: 6.4, height: 3.3, rowOffset: 3.81, legHeight: 2.5 } as const

/** Plek van chippin 1..16 in mm ten opzichte van het midden van de chip. */
export function chipPinLocal(n: number): V3 {
  if (!Number.isInteger(n) || n < 1 || n > 16) throw new RangeError(`Chippin ${n} bestaat niet (1–16)`)
  const half = (7 * 2.54) / 2
  return n <= 8
    ? [-CHIP_DIM.rowOffset, CHIP_DIM.legHeight, -half + (n - 1) * 2.54]
    : [CHIP_DIM.rowOffset, CHIP_DIM.legHeight, half - (n - 9) * 2.54]
}

/** Kanaal CH0..CH7 zit op pin 1..8. */
export const chipChannelLocal = (channel: number): V3 => chipPinLocal(channel + 1)

/** De aansluitingen aan de kant van de Pi, zoals in de 2D-tekening (VDD bovenaan rechts, GND onderaan). */
export const CHIP_LABEL_PIN: Record<string, number> = { VDD: 16, SCLK: 13, MISO: 12, MOSI: 11, CE0: 10, GND: 9 }
export const chipLabelLocal = (label: string): V3 => chipPinLocal(CHIP_LABEL_PIN[label] ?? 16)
