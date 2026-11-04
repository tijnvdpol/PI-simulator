import type { ThreeEvent } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import type { Group, Mesh } from 'three'
import type { PartLive } from '../bench/benchTypes'
import type { Part, PartKind } from '../project/types'
import { partWorld } from './wireGeometry'
import { PartModel } from './models/PartModel'
import { usePalette } from './palette'

export interface PartHandlers {
  onPointerDown?: (part: Part, e: ThreeEvent<PointerEvent>) => void
  onPointerUp?: (part: Part, e: ThreeEvent<PointerEvent>) => void
  onPointerOut?: (part: Part, e: ThreeEvent<PointerEvent>) => void
  onClick?: (part: Part, e: ThreeEvent<MouseEvent>) => void
}

/** Klikvlak (breedte, hoogte, diepte in mm) en hoogte van het midden; de nieuwe onderdelen zijn groter dan een led. */
const HIT: Partial<Record<PartKind, { size: [number, number, number]; y: number }>> = {
  servo: { size: [32, 30, 14], y: 15 },
  distance: { size: [46, 24, 14], y: 14 },
  oled: { size: [28, 32, 8], y: 17 },
}

export interface ScenePartProps extends PartHandlers {
  part: Part
  live: PartLive
  selected: boolean
  /** Aansluitingsprobleem: oranje rand. */
  issue?: boolean
  locked: boolean
}

/** Eén onderdeel op de tafel: model, onzichtbaar klikvlak en selectiering. Het label staat in de HTML-laag (`PartOverlay`). */
export function ScenePart({ part, live, selected, issue = false, locked, ...h }: ScenePartProps) {
  const p = usePalette()
  const model = useRef<Group>(null)
  const [x, , z] = partWorld(part)

  // Alle meshes van het model werpen schaduw.
  useLayoutEffect(() => {
    model.current?.traverse((o) => { if ((o as Mesh).isMesh) o.castShadow = true })
  })

  return (
    <group name={`part-${part.id}`} position={[x, 0, z]} userData={{ partId: part.id, kind: part.kind }}>
      <group ref={model}><PartModel part={part} live={live} /></group>
      {issue && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} name="issue-rim" userData={{ issue: true }}>
          <ringGeometry args={[10, 11.2, 32]} />
          <meshBasicMaterial color={p.warning} />
        </mesh>
      )}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} name="selection">
          <ringGeometry args={[8.5, 9.5, 32]} />
          <meshBasicMaterial color={p.accent} />
        </mesh>
      )}
      <mesh
        name="hit"
        position={[0, HIT[part.kind]?.y ?? 12, 0]}
        onPointerDown={(e) => h.onPointerDown?.(part, e)}
        onPointerUp={(e) => h.onPointerUp?.(part, e)}
        onPointerOut={(e) => h.onPointerOut?.(part, e)}
        onClick={(e) => h.onClick?.(part, e)}
        onPointerOver={(e) => { e.stopPropagation(); e.nativeEvent.target instanceof HTMLElement && (e.nativeEvent.target.style.cursor = locked ? 'default' : 'pointer') }}
      >
        <boxGeometry args={HIT[part.kind]?.size ?? [14, 24, 14]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}
