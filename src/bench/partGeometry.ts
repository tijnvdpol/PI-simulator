import type { Part, PartKind } from '../project/types'
import { pinPosition } from './components/PiBoard'

export const VIEW_W = 900
export const VIEW_H = 700
export const BOARD_POS = { x: 110, y: 240 }

type Pt = { x: number; y: number }

/** Waar de draden aan een onderdeel vastzitten (relatief aan het midden van het onderdeel). */
export const ANCHORS: Record<PartKind, { signal: Pt; ground?: Pt }> = {
  led: { signal: { x: -6, y: 46 }, ground: { x: 6, y: 38 } },
  button: { signal: { x: -10, y: 36 }, ground: { x: 10, y: 36 } },
  buzzer: { signal: { x: -8, y: 38 }, ground: { x: 8, y: 38 } },
  temperature: { signal: { x: 0, y: 32 } },
  potentiometer: { signal: { x: 0, y: 44 } },
}

export const partAnchor = (p: Part, which: 'signal' | 'ground'): Pt => {
  const a = ANCHORS[p.kind][which] ?? ANCHORS[p.kind].signal
  return { x: p.x + a.x, y: p.y + a.y }
}

export const boardPin = (physical: number): Pt => {
  const p = pinPosition(physical)
  return { x: BOARD_POS.x + p.x, y: BOARD_POS.y + p.y }
}

// MCP3008-chip (DIP-16): kanalen links, voeding en SPI rechts.
export const CHIP = { x: 430, y: 40, w: 150, h: 156 }
const ROW = 16
const chipRow = (i: number) => CHIP.y + 24 + i * ROW

export const chipChannelPin = (c: number): Pt => ({ x: CHIP.x, y: chipRow(c) })

/** Rechterkant, van boven naar beneden: pin 16 t/m 9. */
export const CHIP_RIGHT = ['VDD', 'VREF', 'AGND', 'CLK', 'DOUT', 'DIN', 'CS', 'DGND'] as const
const LABEL_ROW: Record<string, number> = { VDD: 0, SCLK: 3, MISO: 4, MOSI: 5, CE0: 6, GND: 7 }
export const chipLabelPin = (label: string): Pt => ({ x: CHIP.x + CHIP.w, y: chipRow(LABEL_ROW[label] ?? 0) })
export const chipRightPin = (i: number): Pt => ({ x: CHIP.x + CHIP.w, y: chipRow(i) })
