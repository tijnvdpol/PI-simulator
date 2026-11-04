import { Leg, Temperature92Body } from './bodies'
import type { PartModelProps } from './types'

/** Temperatuursensor (TMP36 in een TO-92-huisje): zwarte halve cilinder met drie pootjes. */
export function TemperatureModel(_props: PartModelProps) {
  return (
    <group name="temperature">
      {[-1.27, 0, 1.27].map((x) => <Leg key={x} points={[[x, 0, 0], [x, 2, 0.2], [x, 4.3, 0]]} radius={0.26} />)}
      <group position={[0, 4, 0.2]}><Temperature92Body /></group>
    </group>
  )
}
