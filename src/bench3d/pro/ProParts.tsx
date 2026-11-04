import type { ThreeEvent } from '@react-three/fiber'
import { useMemo } from 'react'
import { legPlaces } from '../../circuit/parts'
import { resistorBands } from '../../circuit/resistor'
import type { ProPart } from '../../circuit/types'
import type { PartResult } from '../../circuit/analyze'
import { usePalette } from '../palette'
import { LedBody, ResistorBody, ButtonBody, BuzzerBody, Temperature92Body, TrimmerBody, Leg } from '../models/bodies'
import { BB_TOP, holeXZ, partCenter } from './layout'

export interface ProLive extends Partial<PartResult> {
  pressed?: boolean
  /** 0..1: stand van de potmeter. */
  position?: number
  burnt?: boolean
}

export interface ProPartHandlers {
  onPointerDown?: (part: ProPart, e: ThreeEvent<PointerEvent>) => void
  onPointerUp?: (part: ProPart, e: ThreeEvent<PointerEvent>) => void
  onPointerOut?: (part: ProPart, e: ThreeEvent<PointerEvent>) => void
  onClick?: (part: ProPart, e: ThreeEvent<MouseEvent>) => void
}

type V3 = readonly [number, number, number]
interface LegLocal { name: string; x: number; z: number }

/** Led: pootjes door de gaatjes, epoxy er bovenop. Kapot = zwart en dof. */
function Led({ part, live, legs }: { part: ProPart; live: ProLive; legs: LegLocal[] }) {
  const p = usePalette()
  const color = p[`led-${part.color ?? 'red'}`]
  const burnt = !!live.burnt
  const level = burnt ? 0 : Math.min(1, Math.max(0, live.level ?? 0))
  const on = level > 0
  return (
    <group name="led" userData={{ glow: on ? 'on' : 'off', burnt }}>
      {legs.map((l) => {
        const s = l.name === 'anode' ? -1 : 1
        return <Leg key={l.name} points={[[l.x, -3, l.z], [l.x, 2.5, l.z], [l.x - s * 0.22, 4.2, l.z], [l.x, 5.9, l.z], [l.x, 6.4, l.z]]} />
      })}
      <group position={[0, 6, 0]}><LedBody color={color} level={level} burnt={burnt} /></group>
      <pointLight name="led-light" position={[0, 18, 0]} color={color} intensity={level * 400} distance={60} decay={2} />
    </group>
  )
}

/** Weerstand: beige lichaam met kleurringen, pootjes haaks omlaag de gaatjes in. */
function Resistor({ part, span, legs }: { part: ProPart; span: number; legs: LegLocal[] }) {
  const bands = resistorBands(part.resistance ?? 330)
  const bodyLen = Math.min(6.3, span - 2)
  const half = span / 2
  return (
    <group name="resistor" userData={{ bands }}>
      <group position={[0, 3.6, 0]}><ResistorBody bands={bands} length={bodyLen} /></group>
      {[-1, 1].map((sg) => (
        <Leg key={sg} points={[[sg * (bodyLen / 2 - 0.2), 3.6, 0], [sg * (half - 0.9), 3.6, 0], [sg * half, 2.6, legs[0] ? 0 : 0], [sg * half, 0.5, 0], [sg * half, -3, 0]]} />
      ))}
    </group>
  )
}

function Button({ live, size, legs }: { live: ProLive; size: { w: number; d: number }; legs: LegLocal[] }) {
  const pressed = !!live.pressed
  return (
    <group name="button" userData={{ pressed }}>
      {legs.map((l) => <Leg key={l.name} points={[[l.x * 0.9, 2.6, l.z * 0.9], [l.x, 1.8, l.z], [l.x, 0.4, l.z], [l.x, -3, l.z]]} radius={0.25} />)}
      <ButtonBody pressed={pressed} w={Math.max(6, size.w)} d={Math.max(6, size.d)} />
    </group>
  )
}

function Buzzer({ live, legs }: { live: ProLive; legs: LegLocal[] }) {
  const on = (live.level ?? 0) > 0
  return (
    <group name="buzzer" userData={{ active: on }}>
      {legs.map((l) => <Leg key={l.name} points={[[l.x, -3, l.z], [l.x, 0, l.z], [l.x, 1.5, l.z]]} />)}
      <group position={[0, 1, 0]}><BuzzerBody active={on} /></group>
    </group>
  )
}

function Temperature({ legs }: { legs: LegLocal[] }) {
  return (
    <group name="temperature">
      {legs.map((l) => <Leg key={l.name} points={[[l.x, -3, l.z], [l.x, 1, l.z + 0.2], [l.x, 2.2, l.z]]} radius={0.26} />)}
      <group position={[0, 2, 0]}><Temperature92Body /></group>
    </group>
  )
}

function Potentiometer({ live, legs }: { live: ProLive; legs: LegLocal[] }) {
  const pos = live.position ?? 0.5
  return (
    <group name="potentiometer">
      {legs.map((l) => <Leg key={l.name} points={[[l.x, -3, l.z], [l.x, 0.5, l.z], [l.x, 1.2, l.z]]} />)}
      <TrimmerBody angle={-(pos - 0.5) * Math.PI * 1.5} />
    </group>
  )
}

/**
 * Een onderdeel in het breadboard. De pootjes staan precies in hun gaatjes; het huis staat in het midden van de poten
 * en draait mee in de richting van de poten.
 */
export function ProPartView({ part, live, selected, handlers }: { part: ProPart; live: ProLive; selected: boolean; handlers: ProPartHandlers }) {
  const p = usePalette()
  const legs = useMemo(() => legPlaces(part).map((l) => ({ name: l.name, ...holeXZ(l.col, l.row) })), [part])
  const c = partCenter(part)
  const first = legs[0]
  const last = legs[legs.length - 1]
  const linear = part.kind !== 'button'
  const angle = linear ? -Math.atan2(last.z - first.z, last.x - first.x) : 0
  const span = Math.hypot(last.x - first.x, last.z - first.z)
  const xs = legs.map((l) => l.x)
  const zs = legs.map((l) => l.z)
  const size = { w: Math.max(...xs) - Math.min(...xs) + 1.2, d: Math.max(...zs) - Math.min(...zs) + 1.2 }
  // Poten in de lokale coördinaten van het onderdeel (de groep is gedraaid over `angle`).
  const local: LegLocal[] = legs.map((l) => {
    const dx = l.x - c.x
    const dz = l.z - c.z
    return { name: l.name, x: dx * Math.cos(angle) - dz * Math.sin(angle), z: dx * Math.sin(angle) + dz * Math.cos(angle) }
  })
  // Het klikvlak is zo groot als het huis van het onderdeel, zodat de gaatjes eromheen klikbaar blijven.
  const body: Record<ProPart['kind'], { w: number; d: number; h: number; y: number }> = {
    led: { w: 6, d: 6, h: 12, y: 11 },
    resistor: { w: Math.min(6.3, span - 2) + 1, d: 3, h: 3, y: 3.6 },
    button: { w: Math.max(6, size.w), d: Math.max(6, size.d), h: 5, y: 3.5 },
    buzzer: { w: 12, d: 12, h: 8, y: 5.5 },
    temperature: { w: 5, d: 5, h: 5, y: 3.2 },
    potentiometer: { w: 10, d: 9.5, h: 7, y: 5 },
  }
  const hit = body[part.kind]
  return (
    <group name={`part-${part.id}`} userData={{ partId: part.id, kind: part.kind }}>
      <group position={[c.x, BB_TOP, c.z]} rotation={[0, angle, 0]}>
        {part.kind === 'led' && <Led part={part} live={live} legs={local} />}
        {part.kind === 'resistor' && <Resistor part={part} span={span} legs={local} />}
        {part.kind === 'button' && <Button live={live} size={size} legs={local} />}
        {part.kind === 'buzzer' && <Buzzer live={live} legs={local} />}
        {part.kind === 'temperature' && <Temperature legs={local} />}
        {part.kind === 'potentiometer' && <Potentiometer live={live} legs={local} />}
      </group>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[c.x, BB_TOP + 0.25, c.z]} name="selection">
          <ringGeometry args={[Math.max(5, span / 2 + 2.5, size.d / 2 + 1.5), Math.max(5, span / 2 + 2.5, size.d / 2 + 1.5) + 0.7, 32]} />
          <meshBasicMaterial color={p.accent} />
        </mesh>
      )}
      <mesh
        name="hit"
        position={[c.x, BB_TOP + hit.y, c.z]}
        rotation={[0, angle, 0]}
        onPointerDown={(e) => handlers.onPointerDown?.(part, e)}
        onPointerUp={(e) => handlers.onPointerUp?.(part, e)}
        onPointerOut={(e) => handlers.onPointerOut?.(part, e)}
        onClick={(e) => handlers.onClick?.(part, e)}
        onPointerOver={(e) => { e.stopPropagation(); if (e.nativeEvent.target instanceof HTMLElement) e.nativeEvent.target.style.cursor = 'pointer' }}
      >
        <boxGeometry args={[hit.w, hit.h, hit.d]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}
