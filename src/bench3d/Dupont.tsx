import { RoundedBox } from '@react-three/drei'
import { usePalette } from './palette'

/** Hoogte van het zwarte huisje van een Dupont-stekker (mm) en hoeveel het uitsteekt boven het aansluitpunt. */
export const DUPONT = { w: 2.6, h: 9, femaleTop: 3, maleBottom: 1.5 } as const

/** Hoe hoog de draad uit de stekker komt, gemeten vanaf het aansluitpunt. */
export const dupontTop = (female: boolean) => (female ? DUPONT.femaleTop : DUPONT.maleBottom + DUPONT.h)

/**
 * Zwart Dupont-stekkertje. `female` = bus die over een pin van de Pi schuift (het huisje loopt om de pin heen);
 * anders een mannetje met een zilveren pinnetje dat in een gaatje van het breadboard steekt. `at` = het aansluitpunt.
 */
export function Dupont({ at, female }: { at: readonly [number, number, number]; female: boolean }) {
  const p = usePalette()
  const bottom = female ? at[1] + DUPONT.femaleTop - DUPONT.h : at[1] + DUPONT.maleBottom
  return (
    <group name="dupont" position={[at[0], 0, at[2]]}>
      <RoundedBox args={[DUPONT.w, DUPONT.h, DUPONT.w]} radius={0.3} smoothness={2} position={[0, bottom + DUPONT.h / 2, 0]} castShadow>
        <meshStandardMaterial color={p.ink} roughness={0.45} />
      </RoundedBox>
      {!female && (
        <mesh position={[0, at[1] + DUPONT.maleBottom / 2 - 1.5, 0]} castShadow>
          <boxGeometry args={[0.64, 4.5 + 0.0, 0.64]} />
          <meshStandardMaterial color={p.metal} metalness={1} roughness={0.28} />
        </mesh>
      )}
    </group>
  )
}
