import { PART_ANCHORS } from '../anchors'
import { usePalette } from '../palette'
import type { PartModelProps } from './types'

export const DISTANCE_MIN_CM = 2
export const DISTANCE_MAX_CM = 400
const NEAR = 6   // mm van de voorkant van de sensor bij 2 cm
const FAR = 38   // mm bij 400 cm

/**
 * Hoe ver het voorwerp van de sensor staat, in mm op de tafel. 4 meter past niet op een tafel van 11 cm, dus de afstand
 * wordt logaritmisch ingedrukt: de eerste centimeters zie je duidelijk, 400 cm staat helemaal achteraan.
 */
export function targetOffset(cm: number): number {
  const c = Math.min(DISTANCE_MAX_CM, Math.max(DISTANCE_MIN_CM, cm))
  return NEAR + ((FAR - NEAR) * Math.log(c / DISTANCE_MIN_CM)) / Math.log(DISTANCE_MAX_CM / DISTANCE_MIN_CM)
}

const PCB = { w: 45, h: 20, t: 1.6, y0: 3 } as const
const FRONT = PCB.t / 2 + 6

/** HC-SR04: staande printplaat met twee ‘ogen’ naar je toe en vier pinnen eronder. Het voorwerp schuift met de afstand mee. */
export function DistanceModel({ live }: PartModelProps) {
  const p = usePalette()
  const cm = live.distanceCm ?? 100
  const eye = (name: string, x: number) => (
    <group name={name} position={[x, PCB.y0 + PCB.h / 2, PCB.t / 2 + 5]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[8, 8, 10, 20]} />
        <meshStandardMaterial color={p.metal} metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, 5.05, 0]}>
        <cylinderGeometry args={[6.2, 6.2, 0.2, 20]} />
        <meshStandardMaterial color={p.ink} roughness={0.7} />
      </mesh>
    </group>
  )
  return (
    <group name="distance" userData={{ distanceCm: cm }}>
      <mesh position={[0, PCB.y0 + PCB.h / 2, 0]}>
        <boxGeometry args={[PCB.w, PCB.h, PCB.t]} />
        <meshStandardMaterial color={p.board} roughness={0.7} />
      </mesh>
      {eye('eye-left', -12.5)}
      {eye('eye-right', 12.5)}
      <mesh position={[0, PCB.y0 + PCB.h - 3, PCB.t / 2 + 1]}>
        <boxGeometry args={[7, 3, 2]} />
        <meshStandardMaterial color={p.metal} metalness={0.7} roughness={0.4} />
      </mesh>
      {(['v5', 'trigger', 'echo', 'gnd'] as const).map((t) => {
        const [x] = PART_ANCHORS.distance.terminals![t]
        return (
          <mesh key={t} name={`pin-${t}`} position={[x, 1.5, 0]}>
            <boxGeometry args={[0.6, 3, 0.6]} />
            <meshStandardMaterial color={p.metal} metalness={0.8} roughness={0.4} />
          </mesh>
        )
      })}
      <mesh name="distance-target" position={[0, 10, FRONT + targetOffset(cm)]}>
        <boxGeometry args={[14, 16, 2.5]} />
        <meshStandardMaterial color={p.gold} roughness={0.55} />
      </mesh>
    </group>
  )
}
