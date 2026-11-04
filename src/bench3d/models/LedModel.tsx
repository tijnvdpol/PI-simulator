import { usePalette } from '../palette'
import { Leg, LedBody } from './bodies'
import type { PartModelProps } from './types'

/** Led van 5 mm op de tafel: epoxy met koepel en platte kathodezijde, twee ongelijke pootjes (anode = lang = plus). */
export function LedModel({ part, live }: PartModelProps) {
  const p = usePalette()
  const color = p[`led-${part.color ?? 'red'}`]
  const level = Math.min(1, Math.max(0, live.level ?? 0))
  return (
    <group name="led" userData={{ glow: level > 0 ? 'on' : 'off' }}>
      <Leg points={[[-1.27, 0, 0], [-1.27, 3, 0], [-1.0, 5.2, 0], [-1.27, 7.4, 0], [-1.27, 10.2, 0]]} />
      <Leg points={[[1.27, 2, 0], [1.27, 4.4, 0], [1.0, 6.2, 0], [1.27, 8, 0], [1.27, 10.2, 0]]} />
      <group position={[0, 10, 0]}><LedBody color={color} level={level} /></group>
      {/* Lichtpuntje in de kleur van de led. Blijft altijd bestaan (intensiteit 0 als hij uit is), zodat er niets opnieuw gecompileerd hoeft te worden. */}
      <pointLight name="led-light" position={[0, 21, 0]} color={color} intensity={level * 400} distance={60} decay={2} />
    </group>
  )
}
