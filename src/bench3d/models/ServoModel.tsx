import { PART_ANCHORS } from '../anchors'
import { usePalette } from '../palette'
import type { PartModelProps } from './types'

/** Stand 0..1 → draaihoek van de arm in radialen: 0 = helemaal links (−90°), 0,5 = recht vooruit, 1 = rechts (+90°). */
export const servoAngle = (position: number) => (Math.min(1, Math.max(0, position)) - 0.5) * Math.PI

const BODY = { w: 22.5, d: 11.8, h: 22.7 } as const
const SHAFT_X = 5.6

/** Micro-servo (SG90): blauw huis met montageoogjes, drie kabeltjes links en een arm die met de stand meedraait. */
export function ServoModel({ live }: PartModelProps) {
  const p = usePalette()
  const attached = typeof live.servo === 'number'
  const position = attached ? (live.servo as number) : 0.5
  const cables: [string, 'wire-orange' | 'wire-red' | 'wire-black'][] = [['signal', 'wire-orange'], ['v5', 'wire-red'], ['gnd', 'wire-black']]
  return (
    <group name="servo" userData={{ attached, position }}>
      <mesh position={[0, BODY.h / 2, 0]}>
        <boxGeometry args={[BODY.w, BODY.h, BODY.d]} />
        <meshStandardMaterial color={p.accent} roughness={0.55} />
      </mesh>
      <mesh position={[0, BODY.h - 5, 0]}>
        <boxGeometry args={[BODY.w + 9, 2.4, BODY.d]} />
        <meshStandardMaterial color={p.accent} roughness={0.55} />
      </mesh>
      <mesh position={[SHAFT_X, BODY.h + 1, 0]}>
        <cylinderGeometry args={[2.8, 2.8, 2, 14]} />
        <meshStandardMaterial color={p['metal-dark']} roughness={0.5} />
      </mesh>
      {cables.map(([t, token]) => {
        const [, y, z] = PART_ANCHORS.servo.terminals![t]
        return (
          <mesh key={t} name={`cable-${t}`} position={[-BODY.w / 2 - 1.5, y, z]}>
            <boxGeometry args={[3, 1.4, 1.4]} />
            <meshStandardMaterial color={p[token]} roughness={0.6} />
          </mesh>
        )
      })}
      <group name="servo-arm" position={[SHAFT_X, BODY.h + 2.4, 0]} rotation={[0, attached ? servoAngle(position) : 0, 0]}>
        {/* arm wijst bij het midden naar je toe (+z) */}
        <mesh position={[0, 0.4, 7]}>
          <boxGeometry args={[4, 1.2, 16]} />
          <meshStandardMaterial color={p.fg} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[3.4, 3.4, 1.4, 14]} />
          <meshStandardMaterial color={p.fg} roughness={0.5} />
        </mesh>
      </group>
    </group>
  )
}
