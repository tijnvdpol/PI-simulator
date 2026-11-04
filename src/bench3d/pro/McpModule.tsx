import { useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Object3D, type InstancedMesh } from 'three'
import { usePalette } from '../palette'
import { CH_PITCH, MCP_CENTER, MCP_SIZE, MCP_TOP, adcXYZ } from './layout'
import type { HoleMark } from './Breadboard'

/** De ingebouwde MCP3008-module met 8 kanaalaansluitingen (CH0–CH7). De SPI-draden naar de Pi zijn vast. */
export function McpModule({ marks, onHover, onClick }: { marks: Map<string, HoleMark>; onHover?: (id: string | null) => void; onClick?: (id: string) => void }) {
  const p = usePalette()
  const invalidate = useThree((s) => s.invalidate)
  const sockets = useRef<InstancedMesh>(null)
  const colors = useMemo(() => ({ base: p.gold, hover: p.accent, pending: p.accent, ok: p.accent, bad: p.danger, used: p.warning }), [p])
  useLayoutEffect(() => {
    const m = sockets.current
    if (!m) return
    const o = new Object3D()
    for (let c = 0; c < 8; c++) {
      const a = adcXYZ(c)
      o.position.set(a.x - MCP_CENTER.x, MCP_TOP + 0.4, a.z - MCP_CENTER.z)
      o.updateMatrix()
      m.setMatrixAt(c, o.matrix)
    }
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [])
  useLayoutEffect(() => {
    const m = sockets.current
    if (!m) return
    for (let c = 0; c < 8; c++) m.setColorAt(c, colors[marks.get(`adc:${c}`) ?? 'base'])
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    invalidate()
  }, [marks, colors, invalidate])
  return (
    <group name="mcp-module" position={[MCP_CENTER.x, 0, MCP_CENTER.z]}>
      <mesh position={[0, MCP_TOP / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[MCP_SIZE.w, MCP_TOP, MCP_SIZE.d]} />
        <meshStandardMaterial color={p.board} roughness={0.55} />
      </mesh>
      <mesh position={[-3.5, MCP_TOP + 0.8, 0]}>
        <boxGeometry args={[6, 1.6, 16]} />
        <meshStandardMaterial color={p.ink} roughness={0.7} />
      </mesh>
      <instancedMesh
        ref={sockets}
        args={[undefined, undefined, 8]}
        name="adc-sockets"
        onPointerMove={(e) => { e.stopPropagation(); if (e.instanceId !== undefined) onHover?.(`adc:${e.instanceId}`) }}
        onPointerOut={() => onHover?.(null)}
        onClick={(e) => { if (e.instanceId !== undefined) { e.stopPropagation(); onClick?.(`adc:${e.instanceId}`) } }}
      >
        <boxGeometry args={[2.6, 0.8, CH_PITCH * 0.6]} />
        <meshStandardMaterial roughness={0.4} metalness={0.4} />
      </instancedMesh>
    </group>
  )
}
