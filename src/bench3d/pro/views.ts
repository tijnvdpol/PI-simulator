import { VIEW_LABELS, type CameraLimits, type CameraView, type ViewName } from '../cameraViews'
import { BB_CENTER, PRO_TABLE } from './layout'

export { VIEW_LABELS }

const tz = BB_CENTER.z + 18

/** Camerastanden voor de pro-werkbank: Pi en breadboard samen in beeld. */
export const PRO_VIEWS: Record<ViewName, CameraView> = {
  top: { position: [PRO_TABLE.cx - 12, 190, tz + 0.01], target: [PRO_TABLE.cx - 12, 0, tz] },
  oblique: { position: [-85, 100, 50], target: [PRO_TABLE.cx - 12, 0, tz - 8] },
  pins: { position: [-12, 55, -18], target: [-12, 8, -34] },
  reset: { position: [PRO_TABLE.cx - 12, 120, tz + 85], target: [PRO_TABLE.cx - 12, 0, tz - 6] },
}

export const PRO_LIMITS: CameraLimits = {
  minDistance: 12,
  maxDistance: 320,
  minPolarAngle: 0,
  maxPolarAngle: Math.PI / 2 - 0.06,
  target: { x: [-70, 110], y: [0, 20], z: [-100, 60] },
} as unknown as CameraLimits
