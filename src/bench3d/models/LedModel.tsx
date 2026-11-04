import { usePalette } from '../palette'
import type { PartModelProps } from './types'

/** Led van 5 mm: cilinder met koepel, flens en twee pootjes (lang = plus). */
export function LedModel({ part, live }: PartModelProps) {
  const p = usePalette()
  const color = p[`led-${part.color ?? 'red'}`]
  const level = Math.min(1, Math.max(0, live.level ?? 0))
  const on = level > 0
  const glow = on ? 0.35 + 0.65 * level : 0
  const material = (
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow} transparent opacity={on ? 1 : 0.72} roughness={0.35} />
  )
  return (
    <group name="led" userData={{ glow: on ? 'on' : 'off' }}>
      <mesh position={[-1.27, 5, 0]}>
        <boxGeometry args={[0.5, 10, 0.5]} />
        <meshStandardMaterial color={p.metal} metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[1.27, 4, 0]}>
        <boxGeometry args={[0.5, 8, 0.5]} />
        <meshStandardMaterial color={p.metal} metalness={0.8} roughness={0.4} />
      </mesh>
      <group position={[0, 10, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[2.9, 2.9, 1, 16]} />
          {material}
        </mesh>
        <mesh position={[0, 4.5, 0]}>
          <cylinderGeometry args={[2.5, 2.5, 7, 16]} />
          {material}
        </mesh>
        <mesh position={[0, 8, 0]}>
          <sphereGeometry args={[2.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          {material}
        </mesh>
      </group>
      {/* Lichtpuntje in de kleur van de led. Blijft altijd bestaan (intensiteit 0 als hij uit is), zodat er niets opnieuw gecompileerd hoeft te worden. */}
      <pointLight name="led-light" position={[0, 20, 0]} color={color} intensity={level * 400} distance={60} decay={2} />
    </group>
  )
}
