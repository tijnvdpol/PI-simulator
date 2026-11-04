import type { Part } from '../project/types'

/**
 * Onderdelen bewaren hun plek in "werkbankeenheden" (oorspronkelijk de coördinaten van de 2D-tekening, 900 × 700).
 * De 3D-werkbank rekent die om naar millimeters: 1 mm = 8 eenheden (zie `bench3d/geometry.ts`), zodat opgeslagen
 * projecten ongewijzigd blijven werken.
 */
export const VIEW_W = 900
export const VIEW_H = 700
/** Linkerbovenhoek van de Pi. */
export const BOARD_POS = { x: 110, y: 240 }

type Pt = { x: number; y: number }

/** Plek van de MCP3008-chip (voor de analoge onderdelen). */
export const CHIP = { x: 430, y: 40, w: 150, h: 156 }

// Plekken bovenin de werkbank (buiten de MCP3008-chip) voor onderdelen die met het toetsenbord worden toegevoegd.
const SLOTS: Pt[] = [
  ...[100, 240, 370, 650, 790].map((x) => ({ x, y: 120 })),
  ...[135, 275, 405, 685, 825].map((x) => ({ x, y: 80 })),
]

/** Eerste vrije plek voor een nieuw onderdeel (zonder slepen). */
export function defaultDropPosition(parts: Part[]): Pt {
  const free = SLOTS.find((s) => !parts.some((p) => Math.hypot(p.x - s.x, p.y - s.y) < 40))
  return free ?? SLOTS[parts.length % SLOTS.length]
}
