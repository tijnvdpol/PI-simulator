import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { LIMITS, VIEWS, clampTarget, type ViewName } from './cameraViews'

export interface ViewRequest { view: ViewName; nonce: number }

/**
 * Draaien en zoomen met grenzen, plus soepele overgangen naar een camerastand.
 * Bij `frameloop="demand"` vraagt de overgang zelf nieuwe frames aan zolang hij loopt.
 */
export function CameraRig({ request, enabled = true }: { request: ViewRequest | null; enabled?: boolean }) {
  const controls = useRef<OrbitControlsImpl>(null)
  const goal = useRef<{ pos: Vector3; target: Vector3 } | null>(null)
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    if (!request) return
    const v = VIEWS[request.view]
    goal.current = { pos: new Vector3(...v.position), target: new Vector3(...v.target) }
    invalidate()
  }, [request, invalidate])

  useFrame((_, dt) => {
    const g = goal.current
    const c = controls.current
    if (!g || !c) return
    const k = 1 - Math.exp(-9 * Math.min(dt, 0.05))
    camera.position.lerp(g.pos, k)
    c.target.lerp(g.target, k)
    if (camera.position.distanceTo(g.pos) < 0.05 && c.target.distanceTo(g.target) < 0.05) {
      camera.position.copy(g.pos)
      c.target.copy(g.target)
      goal.current = null
    } else {
      invalidate()
    }
    c.update()
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={enabled}
      enableDamping
      dampingFactor={0.12}
      minDistance={LIMITS.minDistance}
      maxDistance={LIMITS.maxDistance}
      minPolarAngle={LIMITS.minPolarAngle}
      maxPolarAngle={LIMITS.maxPolarAngle}
      target={VIEWS.reset.target}
      onStart={() => { goal.current = null }}
      onChange={(e) => { if (e?.target) clampTarget((e.target as OrbitControlsImpl).target) }}
    />
  )
}
