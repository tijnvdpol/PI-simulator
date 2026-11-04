import { usePalette } from '../palette'
import type { PartModelProps } from './types'

/** Temperatuursensor (TMP36 in een TO-92-huisje): halfronde zwarte body met drie pootjes. */
export function TemperatureModel(_props: PartModelProps) {
  const p = usePalette()
  return (
    <group name="temperature">
      {[-1.27, 0, 1.27].map((x) => (
        <mesh key={x} position={[x, 2, 0]}>
          <boxGeometry args={[0.5, 4, 0.5]} />
          <meshStandardMaterial color={p.metal} metalness={0.8} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 4 + 2.5, 0]} scale={[1, 1, 0.8]}>
        <cylinderGeometry args={[2.5, 2.5, 5, 10]} />
        <meshStandardMaterial color={p.ink} roughness={0.7} />
      </mesh>
      <mesh position={[0, 4 + 5, 0]} scale={[1, 1, 0.8]}>
        <sphereGeometry args={[2.5, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={p.ink} roughness={0.7} />
      </mesh>
    </group>
  )
}
