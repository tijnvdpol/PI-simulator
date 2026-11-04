import { BuzzerBody, Leg } from './bodies'
import type { PartModelProps } from './types'

/** Buzzer: zwarte cilinder met een gaatje bovenin en een "+" bij de plus-poot. Het gaatje licht op als hij piept. */
export function BuzzerModel({ live }: PartModelProps) {
  const active = (live.level ?? 0) > 0
  return (
    <group name="buzzer" userData={{ active }}>
      {[-3.8, 3.8].map((x) => <Leg key={x} points={[[x, 0, 0], [x, 1.2, 0], [x, 2.4, 0]]} />)}
      <group position={[0, 1, 0]}><BuzzerBody active={active} /></group>
    </group>
  )
}
