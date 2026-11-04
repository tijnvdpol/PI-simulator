import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group, Mesh, MeshStandardMaterial, PointLight } from 'three'
import { usePalette } from '../palette'

export const BURN_SECONDS = 2.2
const PUFFS = 7

/** Een led brandt door: een rood flitsje en een paar grijze rookwolkjes die omhoog drijven en vervagen. */
export function BurnEffect({ x, y, z, onDone }: { x: number; y: number; z: number; onDone?: () => void }) {
  const p = usePalette()
  const invalidate = useThree((s) => s.invalidate)
  const group = useRef<Group>(null)
  const light = useRef<PointLight>(null)
  const t = useRef(0)
  const done = useRef(false)

  useFrame((_, dt) => {
    if (done.current) return
    t.current += Math.min(dt, 0.1)
    const age = t.current
    if (light.current) light.current.intensity = age < 0.35 ? 900 * (1 - age / 0.35) : 0
    group.current?.children.forEach((c, i) => {
      if (i === 0) return
      const puff = c as Mesh
      const k = i - 1
      const delay = k * 0.12
      const a = Math.max(0, (age - delay) / (BURN_SECONDS - delay))
      puff.visible = a > 0 && a < 1
      puff.position.set(Math.sin(k * 2.1) * 2.5 * a, 17 + a * 22, Math.cos(k * 1.7) * 2.5 * a)
      puff.scale.setScalar(1.4 + a * 3.6)
      ;(puff.material as MeshStandardMaterial).opacity = 0.7 * (1 - a * a)
    })
    if (age >= BURN_SECONDS) { done.current = true; onDone?.() }
    invalidate()
  })

  return (
    <group ref={group} name="burn-effect" position={[x, y, z]}>
      <pointLight ref={light} color={p.danger} intensity={900} distance={50} decay={2} position={[0, 12, 0]} />
      {Array.from({ length: PUFFS }, (_, i) => (
        <mesh key={i} visible={false}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color={p.smoke} transparent opacity={0.5} roughness={1} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}
