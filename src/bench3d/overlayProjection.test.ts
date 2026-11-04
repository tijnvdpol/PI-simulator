import { PerspectiveCamera } from 'three'
import { describe, expect, it } from 'vitest'
import { projectToScreen } from './overlayProjection'

function topCamera() {
  const cam = new PerspectiveCamera(40, 2, 1, 600)
  cam.position.set(0, 100, 0.001)
  cam.lookAt(0, 0, 0)
  cam.updateMatrixWorld(true)
  return cam
}

describe('projectToScreen', () => {
  it('het punt waar de camera naar kijkt ligt midden in het beeld', () => {
    const p = projectToScreen([0, 0, 0], topCamera(), 800, 400)!
    expect(p.x).toBeCloseTo(400, 1)
    expect(p.y).toBeCloseTo(200, 1)
  })
  it('rechts in de wereld is rechts op het scherm, en naar de kijker toe (+z) is lager op het scherm', () => {
    const cam = topCamera()
    const c = projectToScreen([0, 0, 0], cam, 800, 400)!
    expect(projectToScreen([20, 0, 0], cam, 800, 400)!.x).toBeGreaterThan(c.x)
    expect(projectToScreen([0, 0, 20], cam, 800, 400)!.y).toBeGreaterThan(c.y)
  })
  it('een punt achter de camera geeft null', () => {
    expect(projectToScreen([0, 200, 0], topCamera(), 800, 400)).toBeNull()
  })
})
