import { useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Object3D, type InstancedMesh } from 'three'
import { pcbTexture, type SilkItem } from '../env/pcbTexture'
import { Mcp3008Model } from '../models/Mcp3008Model'
import { usePalette } from '../palette'
import { CH_PITCH, MCP_CENTER, MCP_SIZE, MCP_TOP, adcXYZ } from './layout'
import type { HoleMark } from './Breadboard'

const SILK: SilkItem[] = [
  { u: MCP_SIZE.w / 2, v: 2.2, text: 'ADC', size: 1.5 },
  ...Array.from({ length: 8 }, (_, c) => ({ u: MCP_SIZE.w / 2 + 4.1, v: MCP_SIZE.d / 2 + (c - 3.5) * CH_PITCH, text: `CH${c}`, size: 1.15 })),
]

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
  const map = useMemo(() => pcbTexture(MCP_SIZE.w, MCP_SIZE.d, { mask: p.board, silk: p.fg, pad: p.gold, silkItems: SILK, seed: 5, flipY: true }), [p])
  useEffect(() => () => map?.dispose(), [map])
  return (
    <group name="mcp-module" position={[MCP_CENTER.x, 0, MCP_CENTER.z]}>
      {/* vier afstandsbusjes onder de printplaat */}
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} position={[sx * 6, (MCP_TOP - 1.6) / 2, sz * 20.5]} castShadow>
          <cylinderGeometry args={[1.5, 1.5, MCP_TOP - 1.6, 6]} />
          <meshStandardMaterial color={p.metal} metalness={1} roughness={0.35} />
        </mesh>
      )))}
      <RoundedBox args={[MCP_SIZE.w, 1.6, MCP_SIZE.d]} radius={0.6} smoothness={3} position={[0, MCP_TOP - 0.8, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color={p.board} roughness={0.5} clearcoat={0.18} clearcoatRoughness={0.45} />
      </RoundedBox>
      <mesh name="mcp-top" rotation={[-Math.PI / 2, 0, 0]} position={[0, MCP_TOP + 0.02, 0]} receiveShadow>
        <planeGeometry args={[MCP_SIZE.w - 1.2, MCP_SIZE.d - 1.2]} />
        <meshPhysicalMaterial color={p.board} map={map} roughness={0.5} clearcoat={0.18} clearcoatRoughness={0.45} />
      </mesh>
      <group position={[-3.5, MCP_TOP, 0]}><Mcp3008Model /></group>
      <instancedMesh
        ref={sockets}
        args={[undefined, undefined, 8]}
        name="adc-sockets"
        onPointerMove={(e) => { e.stopPropagation(); if (e.instanceId !== undefined) onHover?.(`adc:${e.instanceId}`) }}
        onPointerOut={() => onHover?.(null)}
        onClick={(e) => { if (e.instanceId !== undefined) { e.stopPropagation(); onClick?.(`adc:${e.instanceId}`) } }}
      >
        <boxGeometry args={[2.6, 0.8, CH_PITCH * 0.6]} />
        <meshStandardMaterial roughness={0.3} metalness={0.95} />
      </instancedMesh>
    </group>
  )
}
