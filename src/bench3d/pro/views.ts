import { VIEW_LABELS, type CameraLimits, type CameraView, type ViewName } from '../cameraViews'
import { HEADER, PI_ORIGIN, PITCH } from '../geometry'
import { BB_CENTER, PRO_TABLE } from './layout'

export { VIEW_LABELS }

const cx = PRO_TABLE.cx
const cz = PRO_TABLE.cz
/** Tussen het breadboard en de Pi-header, waar de draden lopen. */
const wireX = (BB_CENTER.x + 41 + PI_ORIGIN.x + HEADER.firstU + (19 * PITCH) / 2) / 2
const headerZ = PI_ORIGIN.z + HEADER.centerV

/** Camerastanden voor de pro-werkbank: breadboard, Pi en MCP3008-module naast elkaar in beeld. */
export const PRO_VIEWS: Record<ViewName, CameraView> = {
  top: { position: [cx, 300, cz + 0.01], target: [cx, 0, cz] },
  oblique: { position: [cx - 150, 250, cz + 210], target: [cx + 5, 0, cz - 5] },
  pins: { position: [wireX, 75, headerZ + 60], target: [wireX, 6, headerZ + 4] },
  reset: { position: [cx, 210, cz + 290], target: [cx, 0, cz - 5] },
}

export const PRO_LIMITS: CameraLimits = {
  minDistance: 12,
  maxDistance: 520,
  minPolarAngle: 0,
  maxPolarAngle: Math.PI / 2 - 0.06,
  target: { x: [cx - 130, cx + 130], y: [0, 20], z: [cz - 70, cz + 70] },
} as unknown as CameraLimits
