import { usePalette } from '../palette'
import type { PartModelProps } from './types'

/** Buzzer: zwarte cilinder met een gaatje bovenin. Het gaatje licht op als hij piept. */
export function BuzzerModel({ live }: PartModelProps) {
  const p = usePalette()
  const active = (live.level ?? 0) > 0
  return (
    <group name="buzzer" userData={{ active }}>
      {[-3.8, 3.8].map((x) => (
        <mesh key={x} position={[x, 1, 0]}>
          <boxGeometry args={[0.5, 2, 0.5]} />
          <meshStandardMaterial color={p.metal} metalness={0.8} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 1 + 4.75, 0]}>
        <cylinderGeometry args={[6, 6, 9.5, 20]} />
        <meshStandardMaterial color={p.ink} roughness={0.6} />
      </mesh>
      <mesh position={[0, 10.55, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 0.2, 12]} />
        <meshStandardMaterial color={active ? p.accent : p.line} emissive={p.accent} emissiveIntensity={active ? 1.2 : 0} />
      </mesh>
    </group>
  )
}
