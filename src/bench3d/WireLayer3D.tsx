import { useEffect, useMemo } from 'react'
import type { Part } from '../project/types'
import type { Wire } from '../bench/wires'
import { Dupont, dupontTop } from './Dupont'
import { usePalette } from './palette'
import { WIRE_RADIUS, wireEnds, wireGeometry, type WireEnds } from './wireGeometry'

function WireTube({ wire, ends, lane }: { wire: Wire; ends: WireEnds; lane: number }) {
  const p = usePalette()
  const key = `${ends.a.join(',')}|${ends.b.join(',')}|${lane}`
  // De draad komt uit een Dupont-stekker op de pin; het andere uiteinde zit aan het onderdeel.
  const geometry = useMemo(() => wireGeometry({ a: ends.a, b: [ends.b[0], ends.b[1] + dupontTop(true), ends.b[2]] }, lane), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geometry.dispose(), [geometry])
  const color = p[`wire-${wire.color}`]
  return (
    <group name={`wire-${wire.id}`} userData={{ color: wire.color, kind: wire.kind }}>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial color={color} roughness={0.38} clearcoat={0.35} clearcoatRoughness={0.4} />
      </mesh>
      <Dupont at={ends.b} female />
      <mesh position={ends.a}>
        <sphereGeometry args={[WIRE_RADIUS * 1.15, 8, 6]} />
        <meshPhysicalMaterial color={color} roughness={0.38} clearcoat={0.35} clearcoatRoughness={0.4} />
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
