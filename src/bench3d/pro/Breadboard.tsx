import { useThree, type ThreeEvent } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Object3D, type InstancedMesh } from 'three'
import { allHoles, allRailHoles, internalGroup, parseTerminal } from '../../circuit/breadboard'
import { breadboardTextures } from '../env/breadboardTexture'
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

const noRaycast = () => null

/**
 * Het breadboard (half formaat, 30 kolommen): afgerond, gebroken wit mat kunststof. De bovenkant is een afbeelding met echt
 * verzonken gaatjes (kleur + hoogtekaart), letters a–j, kolomnummers en rode/blauwe lijnen bij de rails.
 * Over de 400 aansluitpunten liggen twee InstancedMeshes: een onzichtbare om op te hoveren en klikken (`holes`) en een die
 * alleen de gemarkeerde gaatjes laat oplichten (`hole-marks`).
 */
export function Breadboard({ marks, onHover, onClick, onPointerMove }: BreadboardProps) {
  const p = usePalette()
  const invalidate = useThree((s) => s.invalidate)
  const holes = useRef<InstancedMesh>(null)
  const lit = useRef<InstancedMesh>(null)
  const colors = useMemo(() => ({ hover: p.accent, pending: p.gold, ok: p.accent, bad: p.danger }), [p])
  const tex = useMemo(() => breadboardTextures({ body: p.bb, hole: p['bb-hole'], ink: p['metal-dark'], plus: p['wire-red'], minus: p['wire-blue'] }), [p])
  useEffect(() => () => { tex?.map.dispose(); tex?.bump.dispose() }, [tex])

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

  // Alleen gemarkeerde gaatjes worden getekend (een gebruikt gaatje zit al vol met een pootje of draad).
  useLayoutEffect(() => {
    const m = lit.current
    if (!m) return
    const o = new Object3D()
    let n = 0
    for (const [id, mark] of marks) {
      const i = INDEX.get(id)
      if (i === undefined || mark === 'used') continue
      const { x, z } = terminalXZ(id)
      o.position.set(x - BB_CENTER.x, BB_TOP + 0.08, z - BB_CENTER.z)
      o.rotation.set(-Math.PI / 2, 0, 0)
      o.updateMatrix()
      m.setMatrixAt(n, o.matrix)
      m.setColorAt(n, colors[mark])
      n++
    }
    m.count = n
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    invalidate()
  }, [marks, colors, invalidate])

  return (
    <group name="breadboard" position={[BB_CENTER.x, 0, BB_CENTER.z]}>
      <RoundedBox args={[BB_SIZE.w, BB_TOP, BB_SIZE.d]} radius={1} smoothness={3} position={[0, BB_TOP / 2, 0]} castShadow receiveShadow onPointerMove={onPointerMove}>
        <meshStandardMaterial color={p.bb} roughness={0.72} />
      </RoundedBox>
      <mesh name="bb-top" rotation={[-Math.PI / 2, 0, 0]} position={[0, BB_TOP + 0.02, 0]} receiveShadow onPointerMove={onPointerMove}>
        <planeGeometry args={[BB_SIZE.w - 0.4, BB_SIZE.d - 0.4]} />
        <meshStandardMaterial color={tex ? undefined : p.bb} map={tex?.map} bumpMap={tex?.bump} bumpScale={tex ? 2.2 : 0} roughness={0.7} />
      </mesh>
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
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={lit} args={[undefined, undefined, BOARD_TERMINALS.length]} name="hole-marks" raycast={noRaycast} frustumCulled={false}>
        <planeGeometry args={[1.9, 1.9]} />
        <meshBasicMaterial transparent opacity={0.9} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

export const holeIndex = (id: string) => INDEX.get(id)
