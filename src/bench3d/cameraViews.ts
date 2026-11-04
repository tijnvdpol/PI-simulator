import { HEADER, PI_ORIGIN, PITCH } from './geometry'
import type { V3 } from './anchors'

export type ViewName = 'top' | 'oblique' | 'pins' | 'reset'

export interface CameraView { position: V3; target: V3 }

export const VIEW_LABELS: Record<ViewName, string> = {
  top: 'Bovenaanzicht',
  oblique: 'Schuin',
  pins: 'Pinnen dichtbij',
  reset: 'Reset',
}
export const VIEW_ORDER: readonly ViewName[] = ['top', 'oblique', 'pins', 'reset']

const headerX = PI_ORIGIN.x + HEADER.firstU + (19 * PITCH) / 2
const headerZ = PI_ORIGIN.z + HEADER.centerV

export const VIEWS: Record<ViewName, CameraView> = {
  // Een heel klein beetje scheef, anders is "boven" een singulariteit voor de camerabesturing.
  top: { position: [0, 125, 0.01], target: [0, 0, 0] },
  oblique: { position: [-55, 65, 60], target: [0, 0, 0] },
  pins: { position: [headerX, 38, headerZ + 32], target: [headerX, 3, headerZ] },
  reset: { position: [0, 120, 150], target: [0, 0, 12] },
}

/** Grenzen: niet onder de tafel kijken, niet te ver weg of er te dichtbij in, niet van de tafel af schuiven. */
export const LIMITS = {
  minDistance: 15,
  maxDistance: 220,
  minPolarAngle: 0,
  maxPolarAngle: Math.PI / 2 - 0.06,
  target: { x: [-60, 60], y: [0, 20], z: [-50, 50] },
} as const

export type CameraLimits = typeof LIMITS

const clamp = (v: number, [lo, hi]: readonly [number, number] | readonly number[]) => Math.min(hi, Math.max(lo, v))

/** Houd het kijkpunt (waar je omheen draait) boven de tafel. */
export function clampTarget<T extends { x: number; y: number; z: number }>(t: T, limits: Pick<typeof LIMITS, 'target'> = LIMITS): T {
  t.x = clamp(t.x, limits.target.x)
  t.y = clamp(t.y, limits.target.y)
  t.z = clamp(t.z, limits.target.z)
  return t
}

/** Hoek tussen de kijkrichting en recht omhoog (0 = van boven, π/2 = horizontaal). */
export function polarAngle(v: CameraView): number {
  const d = [v.position[0] - v.target[0], v.position[1] - v.target[1], v.position[2] - v.target[2]]
  return Math.acos(d[1] / Math.hypot(d[0], d[1], d[2]))
}
