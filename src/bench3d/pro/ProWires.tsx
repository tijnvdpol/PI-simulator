import { useEffect, useMemo } from 'react'
import { Mesh, type Intersection, type Raycaster } from 'three'
import type { ProWire } from '../../circuit/types'
import { parseTerminal } from '../../circuit/breadboard'
import { Dupont, dupontTop } from '../Dupont'
import { usePalette } from '../palette'
import { wireGeometry, type WireEnds } from '../wireGeometry'
import { terminalWorld } from './layout'

/** Binnen zoveel mm van een uiteinde laat een draad klikken door naar de pin of het gaatje eronder. */
export const END_CLICK_THROUGH = 3.5

/** Raycast die treffers vlak bij de uiteinden van een draad negeert, zodat je meerdere draden op dezelfde pin of hetzelfde gaatje kunt zetten. */
export function wireRaycast(ends: WireEnds) {
  return function (this: Mesh, raycaster: Raycaster, intersects: Intersection[]) {
    const n = intersects.length
    Mesh.prototype.raycast.call(this, raycaster, intersects)
    for (let i = intersects.length - 1; i >= n; i--) {
      const p = intersects[i].point
      const near = [ends.a, ends.b].some((e) => Math.hypot(p.x - e[0], p.y - e[1], p.z - e[2]) < END_CLICK_THROUGH)
      if (near) intersects.splice(i, 1)
    }
  }
}

const v = (t: { x: number; y: number; z: number }) => [t.x, t.y, t.z] as const

export function endsOf(a: string, b: string): WireEnds | null {
  const ta = terminalWorld(a)
  const tb = terminalWorld(b)
  return ta && tb ? { a: v(ta), b: v(tb) } : null
}

/** Een draad eindigt met een bus op een pin van de Pi, en met een stekkertje in een gaatje van het breadboard of de module. */
const isFemale = (id: string) => parseTerminal(id)?.type === 'pin'

function Tube({ wire, ends, ids, lane, selected, ghost, onSelect }: {
  wire: Pick<ProWire, 'id' | 'color'>; ends: WireEnds; ids: readonly [string, string]; lane: number; selected?: boolean; ghost?: boolean; onSelect?: (id: string) => void
}) {
  const p = usePalette()
  const key = `${ends.a.join(',')}|${ends.b.join(',')}|${lane}`
  const female = [isFemale(ids[0]), isFemale(ids[1])] as const
  // De draad begint boven aan de stekker, niet op het aansluitpunt zelf.
  const raised: WireEnds = {
    a: [ends.a[0], ends.a[1] + dupontTop(female[0]), ends.a[2]],
    b: [ends.b[0], ends.b[1] + dupontTop(female[1]), ends.b[2]],
  }
  const geometry = useMemo(() => wireGeometry(raised, lane), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geometry.dispose(), [geometry])
  const raycast = useMemo(() => wireRaycast(ends), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const color = p[`wire-${wire.color}`]
  const mat = <meshPhysicalMaterial color={color} roughness={0.38} clearcoat={0.35} clearcoatRoughness={0.4} transparent={ghost} opacity={ghost ? 0.55 : 1} emissive={selected ? p.accent : p.ink} emissiveIntensity={selected ? 0.55 : 0} />
  return (
    <group name={`wire-${wire.id}`} userData={{ color: wire.color, selected: !!selected }}>
      <mesh geometry={geometry} raycast={raycast} onClick={onSelect ? (e) => { e.stopPropagation(); onSelect(wire.id) } : undefined}>{mat}</mesh>
      <Dupont at={ends.a} female={female[0]} />
      <Dupont at={ends.b} female={female[1]} />
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
        return ends ? <Tube key={w.id} wire={w} ends={ends} ids={[w.a, w.b]} lane={i} selected={w.id === selectedId} onSelect={onSelect} /> : null
      })}
      {pv && <Tube wire={{ id: 'preview', color: 'yellow' }} ends={pv} ids={[preview!.a, preview!.b]} lane={wires.length} ghost />}
    </group>
  )
}
