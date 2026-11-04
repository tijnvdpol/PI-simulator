import { useLayoutEffect, useRef } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Object3D, type InstancedMesh } from 'three'
import { CHIP_DIM, chipPinLocal } from '../anchors'
import { usePalette } from '../palette'

/** MCP3008 (DIP-16) voor de analoge onderdelen. Het midden van de chip is de oorsprong. */
export function Mcp3008Model({ usedChannels = [] }: { usedChannels?: number[] }) {
  const p = usePalette()
  const legs = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = legs.current
    if (!m) return
    const o = new Object3D()
    for (let n = 1; n <= 16; n++) {
      const [x, , z] = chipPinLocal(n)
      o.position.set(x, 1.25, z)
      o.updateMatrix()
      m.setMatrixAt(n - 1, o.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <group name="mcp3008" userData={{ usedChannels }}>
      <RoundedBox args={[CHIP_DIM.width, CHIP_DIM.height, CHIP_DIM.length]} radius={0.3} smoothness={3} position={[0, 1 + CHIP_DIM.height / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={p.ink} roughness={0.5} />
      </RoundedBox>
      {/* inkeping bij pin 1 */}
      <mesh position={[0, 1 + CHIP_DIM.height + 0.02, -CHIP_DIM.length / 2 + 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.7, 10]} />
        <meshStandardMaterial color={p.line} />
      </mesh>
      <instancedMesh ref={legs} args={[undefined, undefined, 16]}>
        <boxGeometry args={[0.5, 2.5, 0.5]} />
        <meshStandardMaterial color={p.metal} metalness={1} roughness={0.3} />
      </instancedMesh>
    </group>
  )
}
