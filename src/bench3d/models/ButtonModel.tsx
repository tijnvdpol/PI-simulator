import { usePalette } from '../palette'
import type { PartModelProps } from './types'

export const BUTTON_TRAVEL = 0.8

/** Drukknop van 6 × 6 mm met een knopje dat naar beneden beweegt als hij ingedrukt is. */
export function ButtonModel({ live }: PartModelProps) {
  const p = usePalette()
  const pressed = !!live.pressed
  return (
    <group name="button" userData={{ pressed }}>
      {[-3.25, 3.25].flatMap((x) => [-2.25, 2.25].map((z) => (
        <mesh key={`${x}${z}`} position={[x, 0.5, z]}>
          <boxGeometry args={[0.5, 1, 0.5]} />
          <meshStandardMaterial color={p.metal} metalness={0.8} roughness={0.4} />
        </mesh>
      )))}
      <mesh position={[0, 2.75, 0]}>
        <boxGeometry args={[6, 3.5, 6]} />
        <meshStandardMaterial color={p.ink} roughness={0.7} />
      </mesh>
      <mesh name="button-cap" position={[0, 4.25 + 0.75 - (pressed ? BUTTON_TRAVEL : 0), 0]}>
        <cylinderGeometry args={[1.75, 1.75, 1.5, 14]} />
        <meshStandardMaterial color={p['fg-muted']} roughness={0.5} />
      </mesh>
    </group>
  )
}
