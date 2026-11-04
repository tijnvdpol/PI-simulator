import { useThree, type ThreeEvent } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Object3D, type InstancedMesh } from 'three'
import { allHoles, allRailHoles, internalGroup, parseTerminal } from '../../circuit/breadboard'
import { usePalette } from '../palette'
import { BB_CENTER, BB_SIZE, BB_TOP, P, holeXZ, railXZ } from './layout'

/** Alle 400 aansluitpunten van het breadboard, in vaste volgorde: instance-nummer = index in deze lijst. */
export const BOARD_TERMINALS: readonly string[] = [...allHoles(), ...allRailHoles()]
const INDEX = new Map(BOARD_TERMINALS.map((id, i) => [id, i]))

export function terminalXZ(id: string): { x: number; z: number } {
  const t = parseTerminal(id)!
  return t.type === 'hole' ? holeXZ(t.col, t.row) : t.type === 'rail' ? railXZ(t.rail, t.index) : { x: 0, z: 0 }
}

export type HoleMark = 'hover' | 'pending' | 'ok' | 'bad' | 'used'

/** Kleurkeuze per aansluitpunt: wat er gemarkeerd moet worden, in volgorde van belang (laatste wint). */
export function holeMarks(o: { hover: string | null; pending: string | null; ghost: { holes: string[]; ok: boolean } | null; used: ReadonlySet<string> }): Map<string, HoleMark> {
  const marks = new Map<string, HoleMark>()
  for (const id of o.used) marks.set(id, 'used')
  if (o.hover) for (const id of internalGroup(o.hover)) marks.set(id, 'hover')
  if (o.pending) marks.set(o.pending, 'pending')
  if (o.ghost) for (const id of o.ghost.holes) marks.set(id, o.ghost.ok ? 'ok' : 'bad')
  return marks
}

export interface BreadboardProps {
  marks: Map<string, HoleMark>
  onHover?: (id: string | null) => void
  onClick?: (id: string) => void
  onPointerMove?: (e: ThreeEvent<PointerEvent>) => void
}

/** Het breadboard: een bord met 300 gaatjes in rijen van 5 en vier stroomrails. De gaatjes zijn één InstancedMesh. */
export function Breadboard({ marks, onHover, onClick, onPointerMove }: BreadboardProps) {
  const p = usePalette()
  const invalidate = useThree((s) => s.invalidate)
  const holes = useRef<InstancedMesh>(null)
  const colors = useMemo(() => ({ base: p['bb-hole'], hover: p.accent, pending: p.gold, ok: p.accent, bad: p.danger, used: p['metal-dark'] }), [p])

  useLayoutEffect(() => {
    const m = holes.current
    if (!m) return
    const o = new Object3D()
    BOARD_TERMINALS.forEach((id, i) => {
      const { x, z } = terminalXZ(id)
      o.position.set(x - BB_CENTER.x, BB_TOP + 0.1, z - BB_CENTER.z)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [])

  useLayoutEffect(() => {
    const m = holes.current
    if (!m) return
    BOARD_TERMINALS.forEach((id, i) => m.setColorAt(i, colors[marks.get(id) ?? 'base']))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    invalidate()
  }, [marks, colors, invalidate])

  const stripe = (z: number, color: 'wire-red' | 'wire-blue') => (
    <mesh position={[0, BB_TOP + 0.05, z]}>
      <boxGeometry args={[BB_SIZE.w - 8, 0.1, 0.35]} />
      <meshStandardMaterial color={p[color]} roughness={0.6} />
    </mesh>
  )
  return (
    <group name="breadboard" position={[BB_CENTER.x, 0, BB_CENTER.z]}>
      <mesh position={[0, BB_TOP / 2, 0]} castShadow receiveShadow onPointerMove={onPointerMove}>
        <boxGeometry args={[BB_SIZE.w, BB_TOP, BB_SIZE.d]} />
        <meshStandardMaterial color={p.bb} roughness={0.6} />
      </mesh>
      {/* groef in het midden, onder de rijen e en f */}
      <mesh position={[0, BB_TOP + 0.02, 0]}>
        <boxGeometry args={[BB_SIZE.w - 4, 0.1, 2.6]} />
        <meshStandardMaterial color={p['bb-hole']} roughness={0.8} />
      </mesh>
      {stripe(-26.3, 'wire-red')}
      {stripe(-20.3, 'wire-blue')}
      {stripe(20.3, 'wire-blue')}
      {stripe(26.3, 'wire-red')}
      <instancedMesh
        ref={holes}
        args={[undefined, undefined, BOARD_TERMINALS.length]}
        name="holes"
        onPointerMove={(e) => {
          e.stopPropagation()
          if (e.instanceId !== undefined) onHover?.(BOARD_TERMINALS[e.instanceId])
          onPointerMove?.(e)
        }}
        onPointerOut={() => onHover?.(null)}
        onClick={(e) => {
          if (e.instanceId === undefined) return
          e.stopPropagation()
          onClick?.(BOARD_TERMINALS[e.instanceId])
        }}
      >
        <boxGeometry args={[P * 0.62, 0.3, P * 0.62]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
    </group>
  )
}

export const holeIndex = (id: string) => INDEX.get(id)
