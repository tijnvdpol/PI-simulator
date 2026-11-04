import { BUTTON_CAP, ButtonBody, Leg } from './bodies'
import type { PartModelProps } from './types'

export const BUTTON_TRAVEL = BUTTON_CAP.travel

/** Drukknop van 6 × 6 mm met een zwarte kap die naar beneden beweegt als hij ingedrukt is. */
export function ButtonModel({ live }: PartModelProps) {
  const pressed = !!live.pressed
  return (
    <group name="button" userData={{ pressed }}>
      {[-3.25, 3.25].flatMap((x) => [-2.25, 2.25].map((z) => (
        <Leg key={`${x}${z}`} points={[[x * 0.92, 2.6, z], [x, 1.6, z], [x, 0.9, z], [x, 0, z]]} radius={0.25} />
      )))}
      <ButtonBody pressed={pressed} />
    </group>
  )
}
