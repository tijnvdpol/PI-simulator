import { Leg, PotentiometerBody } from './bodies'
import type { PartModelProps } from './types'

/** Draaiknop van 270° voor stand 0..1 (in radialen, 0 = midden). */
export const knobAngle = (position: number) => -(Math.min(1, Math.max(0, position)) - 0.5) * (270 * Math.PI) / 180

/** Potmeter: blauw huis met een geribbelde draaiknop en een standstreep, die meedraait met het schuifje. */
export function PotentiometerModel({ live }: PartModelProps) {
  const position = live.position ?? 0.5
  return (
    <group name="potentiometer">
      {[-2.5, 0, 2.5].map((x) => <Leg key={x} points={[[x, 0, 0], [x, 1.4, 0], [x, 2.2, 0]]} />)}
      <group position={[0, 2, 0]}><PotentiometerBody angle={knobAngle(position)} /></group>
    </group>
  )
}
