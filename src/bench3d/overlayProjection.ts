import { Vector3, type Camera } from 'three'
import type { V3 } from './anchors'

const tmp = new Vector3()

/** Scherm-pixels (vanaf linksboven van het canvas) van een punt in de wereld, of null als het achter de camera ligt. */
export function projectToScreen(point: V3, camera: Camera, width: number, height: number): { x: number; y: number } | null {
  tmp.set(point[0], point[1], point[2]).project(camera)
  if (tmp.z > 1 || tmp.z < -1) return null
  return { x: (tmp.x * 0.5 + 0.5) * width, y: (-tmp.y * 0.5 + 0.5) * height }
}
