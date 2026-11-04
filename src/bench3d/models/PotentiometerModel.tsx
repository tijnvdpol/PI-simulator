import { usePalette } from '../palette'
import type { PartModelProps } from './types'

/** Draaiknop van 270° voor stand 0..1 (in radialen, 0 = midden). */
export const knobAngle = (position: number) => -(Math.min(1, Math.max(0, position)) - 0.5) * (270 * Math.PI) / 180

/** Potmeter: blokje met as en draaiknop die meedraait met het schuifje. */
export function PotentiometerModel({ live }: PartModelProps) {
  const p = usePalette()
  const position = live.position ?? 0.5
  return (
    <group name="potentiometer">
      {[-2.5, 0, 2.5].map((x) => (
        <mesh key={x} position={[x, 1, 0]}>
          <boxGeometry args={[0.5, 2, 0.5]} />
          <meshStandardMaterial color={p.metal} metalness={0.8} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 3.5, 0]}>
        <boxGeometry args={[10, 3, 9]} />
        <meshStandardMaterial color={p['metal-dark']} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 6.5, 0]}>
        <cylinderGeometry args={[3, 3, 3, 12]} />
        <meshStandardMaterial color={p.metal} metalness={0.8} roughness={0.35} />
      </mesh>
      <group name="knob" position={[0, 8, 0]} rotation={[0, knobAngle(position), 0]}>
        <mesh position={[0, 2, 0]}>
          <cylinderGeometry args={[5.5, 5.5, 4, 18]} />
          <meshStandardMaterial color={p.ink} roughness={0.5} />
        </mesh>
        <mesh position={[0, 4.05, -2.5]}>
          <boxGeometry args={[0.9, 0.2, 4]} />
          <meshStandardMaterial color={p.fg} />
        </mesh>
      </group>
    </group>
  )
}
