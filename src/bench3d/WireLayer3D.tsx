import { useEffect, useMemo } from 'react'
import type { Part } from '../project/types'
import type { Wire } from '../bench/wires'
import { usePalette } from './palette'
import { WIRE_RADIUS, wireEnds, wireGeometry, type WireEnds } from './wireGeometry'

function WireTube({ wire, ends, lane }: { wire: Wire; ends: WireEnds; lane: number }) {
  const p = usePalette()
  const key = `${ends.a.join(',')}|${ends.b.join(',')}|${lane}`
  const geometry = useMemo(() => wireGeometry(ends, lane), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geometry.dispose(), [geometry])
  const color = p[`wire-${wire.color}`]
  return (
    <group name={`wire-${wire.id}`} userData={{ color: wire.color, kind: wire.kind }}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {/* kapje op de pin */}
      <mesh position={ends.b}>
        <sphereGeometry args={[WIRE_RADIUS * 1.5, 8, 6]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
    </group>
  )
}

/** Alle draden als dunne buisjes. De draden zelf komen uit `computeWires`, dezelfde bron als in de 2D-versie. */
export function WireLayer3D({ wires, parts }: { wires: Wire[]; parts: Part[] }) {
  return (
    <group name="wires">
      {wires.map((w, i) => {
        const ends = wireEnds(w, parts)
        return ends ? <WireTube key={w.id} wire={w} ends={ends} lane={i} /> : null
      })}
    </group>
  )
}
