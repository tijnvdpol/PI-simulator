import { Plane, Raycaster, Vector2, Vector3, type Camera, type Ray } from 'three'

export * from './placement'

const planes = new Map<number, Plane>()
const planeAt = (height: number) => {
  let p = planes.get(height)
  if (!p) { p = new Plane(new Vector3(0, 1, 0), -height); planes.set(height, p) }
  return p
}

/** Waar een straal (bijv. van de muis) het tafelvlak (of een vlak op `height` mm erboven) raakt, in wereldcoördinaten. */
export function rayToTable(ray: Ray, height = 0): { x: number; z: number } | null {
  const hit = ray.intersectPlane(planeAt(height), new Vector3())
  return hit ? { x: hit.x, z: hit.z } : null
}

/** Idem, vanuit genormaliseerde schermcoördinaten (−1..1) en een camera. */
export function ndcToTable(ndc: { x: number; y: number }, camera: Camera, height = 0): { x: number; z: number } | null {
  const rc = new Raycaster()
  rc.setFromCamera(new Vector2(ndc.x, ndc.y), camera)
  return rayToTable(rc.ray, height)
}
