import type { BufferGeometry, Mesh, Object3D } from 'three'

/** Aantal driehoeken van één geometrie. */
export function geometryTriangles(g: BufferGeometry): number {
  if (g.index) return g.index.count / 3
  return (g.attributes.position?.count ?? 0) / 3
}

/**
 * Aantal driehoeken dat de scène één keer tekent: elke zichtbare mesh telt mee, een InstancedMesh keer zijn aantal.
 * (Schaduw- en nabewerkingsrondes tekenen delen van de scène nog eens; dit is de basis.)
 */
export function sceneTriangles(root: Object3D): number {
  let total = 0
  root.traverseVisible((o) => {
    const m = o as Mesh & { isInstancedMesh?: boolean; count?: number }
    if (!m.isMesh || !m.geometry) return
    const mat = m.material as { visible?: boolean; opacity?: number; transparent?: boolean } | undefined
    if (mat && mat.transparent && mat.opacity === 0) return // onzichtbare klikvlakken tekenen niet
    total += geometryTriangles(m.geometry) * (m.isInstancedMesh ? (m.count ?? 1) : 1)
  })
  return total
}
