import { BoxGeometry, InstancedMesh, Mesh, MeshBasicMaterial, Scene } from 'three'
import { describe, expect, it } from 'vitest'
import { sceneTriangles } from './sceneStats'

describe('sceneTriangles', () => {
  it('telt meshes, vermenigvuldigt instances en slaat onzichtbare klikvlakken over', () => {
    const s = new Scene()
    s.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial())) // 12
    const inst = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial(), 10)
    s.add(inst) // 12 × 10
    s.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ transparent: true, opacity: 0 })))
    const hidden = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial()); hidden.visible = false
    s.add(hidden)
    expect(sceneTriangles(s)).toBe(12 + 120)
  })
})
