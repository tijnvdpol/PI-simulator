import { Plane, Raycaster, Vector2, Vector3, type Camera, type Ray } from 'three'

export * from './placement'

const plane = new Plane(new Vector3(0, 1, 0), 0)

/** Waar een straal (bijv. van de muis) het tafelvlak raakt, in wereldcoördinaten. */
export function rayToTable(ray: Ray): { x: number; z: number } | null {
  const hit = ray.intersectPlane(plane, new Vector3())
  return hit ? { x: hit.x, z: hit.z } : null
}

/** Idem, vanuit genormaliseerde schermcoördinaten (−1..1) en een camera. */
export function ndcToTable(ndc: { x: number; y: number }, camera: Camera): { x: number; z: number } | null {
  const rc = new Raycaster()
  rc.setFromCamera(new Vector2(ndc.x, ndc.y), camera)
  return rayToTable(rc.ray)
}
