import { useEffect, useMemo } from 'react'
import type { ProWire } from '../../circuit/types'
import { usePalette } from '../palette'
import { WIRE_RADIUS, wireGeometry, type WireEnds } from '../wireGeometry'
import { terminalWorld } from './layout'

const v = (t: { x: number; y: number; z: number }) => [t.x, t.y, t.z] as const

export function endsOf(a: string, b: string): WireEnds | null {
  const ta = terminalWorld(a)
  const tb = terminalWorld(b)
  return ta && tb ? { a: v(ta), b: v(tb) } : null
}

function Tube({ wire, ends, lane, selected, ghost, onSelect }: {
  wire: Pick<ProWire, 'id' | 'color'>; ends: WireEnds; lane: number; selected?: boolean; ghost?: boolean; onSelect?: (id: string) => void
}) {
  const p = usePalette()
  const key = `${ends.a.join(',')}|${ends.b.join(',')}|${lane}`
  const geometry = useMemo(() => wireGeometry(ends, lane), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geometry.dispose(), [geometry])
  const color = p[`wire-${wire.color}`]
  const mat = <meshStandardMaterial color={color} roughness={0.5} transparent={ghost} opacity={ghost ? 0.55 : 1} emissive={selected ? p.accent : p.ink} emissiveIntensity={selected ? 0.55 : 0} />
  return (
    <group name={`wire-${wire.id}`} userData={{ color: wire.color, selected: !!selected }}>
      <mesh geometry={geometry} onClick={onSelect ? (e) => { e.stopPropagation(); onSelect(wire.id) } : undefined}>{mat}</mesh>
      {[ends.a, ends.b].map((e, i) => (
        <mesh key={i} position={[e[0], e[1], e[2]]}>
          <sphereGeometry args={[WIRE_RADIUS * 1.5, 8, 6]} />
          {mat}
        </mesh>
      ))}
    </group>
  )
}

/** Jumperdraden als dunne buisjes, plus een doorzichtig voorbeeld van de draad die je aan het maken bent. */
export function ProWires({ wires, selectedId, onSelect, preview }: {
  wires: ProWire[]; selectedId: string | null; onSelect?: (id: string) => void; preview?: { a: string; b: string } | null
}) {
  const pv = preview ? endsOf(preview.a, preview.b) : null
  return (
    <group name="wires">
      {wires.map((w, i) => {
        const ends = endsOf(w.a, w.b)
        return ends ? <Tube key={w.id} wire={w} ends={ends} lane={i} selected={w.id === selectedId} onSelect={onSelect} /> : null
      })}
      {pv && <Tube wire={{ id: 'preview', color: 'yellow' }} ends={pv} lane={wires.length} ghost />}
    </group>
  )
}
