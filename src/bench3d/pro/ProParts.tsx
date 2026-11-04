import type { ThreeEvent } from '@react-three/fiber'
import { useMemo } from 'react'
import { legPlaces } from '../../circuit/parts'
import { resistorBands } from '../../circuit/resistor'
import type { ProPart } from '../../circuit/types'
import type { PartResult } from '../../circuit/analyze'
import { usePalette } from '../palette'
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

interface Pt { x: number; z: number }

/** Een pootje van het gaatje omhoog (lengte in mm boven het bord; metaal). */
function Leg({ at, len }: { at: Pt; len: number }) {
  const p = usePalette()
  return (
    <mesh position={[at.x, BB_TOP + len / 2 - 2, at.z]}>
      <boxGeometry args={[0.5, len + 4, 0.5]} />
      <meshStandardMaterial color={p.metal} metalness={0.8} roughness={0.4} />
    </mesh>
  )
}

function Led({ part, live }: { part: ProPart; live: ProLive }) {
  const p = usePalette()
  const color = p[`led-${part.color ?? 'red'}`]
  const burnt = !!live.burnt
  const level = burnt ? 0 : Math.min(1, Math.max(0, live.level ?? 0))
  const on = level > 0
  const base = burnt ? p.ink : color
  const mat = <meshStandardMaterial color={base} emissive={base} emissiveIntensity={on ? 0.35 + 0.65 * level : 0} transparent={!burnt} opacity={on || burnt ? 1 : 0.72} roughness={burnt ? 0.9 : 0.35} />
  return (
    <group name="led" userData={{ glow: on ? 'on' : 'off', burnt }}>
      <mesh position={[0, 6.5, 0]}><cylinderGeometry args={[2.9, 2.9, 1, 16]} />{mat}</mesh>
      <mesh position={[0, 10.5, 0]}><cylinderGeometry args={[2.5, 2.5, 7, 16]} />{mat}</mesh>
      <mesh position={[0, 14, 0]}><sphereGeometry args={[2.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />{mat}</mesh>
      <pointLight name="led-light" position={[0, 18, 0]} color={color} intensity={level * 400} distance={60} decay={2} />
    </group>
  )
}

function Resistor({ part, span }: { part: ProPart; span: number }) {
  const p = usePalette()
  const bands = resistorBands(part.resistance ?? 330)
  const half = span / 2
  const bodyLen = Math.min(6.3, span - 2)
  const xs = [-0.3, -0.1, 0.1, 0.35].map((f) => f * bodyLen * 0.95)
  return (
    <group name="resistor" userData={{ bands }}>
      <mesh position={[0, 3.6, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1.25, 1.25, bodyLen, 14]} />
        <meshStandardMaterial color={p.resistor} roughness={0.7} />
      </mesh>
      {bands.map((b, i) => (
        <mesh key={i} name={`band-${i}`} position={[xs[i] + (i === 3 ? bodyLen * 0.1 : 0), 3.6, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[1.3, 1.3, 0.55, 14]} />
          <meshStandardMaterial color={p[`band-${b}`]} roughness={0.6} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (bodyLen / 2 + (half - bodyLen / 2) / 2), 3.6, 0]}>
          <boxGeometry args={[half - bodyLen / 2, 0.45, 0.45]} />
          <meshStandardMaterial color={p.metal} metalness={0.8} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

function Button({ live, size }: { live: ProLive; size: { w: number; d: number } }) {
  const p = usePalette()
  const pressed = !!live.pressed
  return (
    <group name="button" userData={{ pressed }}>
      <mesh position={[0, 3, 0]}><boxGeometry args={[Math.max(6, size.w), 3.5, Math.max(6, size.d)]} /><meshStandardMaterial color={p.ink} roughness={0.7} /></mesh>
      <mesh name="button-cap" position={[0, 5.5 - (pressed ? 0.8 : 0), 0]}><cylinderGeometry args={[1.75, 1.75, 1.5, 14]} /><meshStandardMaterial color={p['fg-muted']} roughness={0.5} /></mesh>
    </group>
  )
}

function Buzzer({ live }: { live: ProLive }) {
  const p = usePalette()
  const on = (live.level ?? 0) > 0
  return (
    <group name="buzzer" userData={{ active: on }}>
      <mesh position={[0, 5.5, 0]}><cylinderGeometry args={[6, 6, 8, 20]} /><meshStandardMaterial color={p.ink} roughness={0.7} /></mesh>
      <mesh position={[0, 9.6, 0]}><cylinderGeometry args={[1.2, 1.2, 0.3, 12]} /><meshStandardMaterial color={on ? p.accent : p['metal-dark']} emissive={on ? p.accent : p.ink} emissiveIntensity={on ? 0.8 : 0} /></mesh>
      <mesh position={[-3.8, 9.7, 0]}><boxGeometry args={[1.6, 0.2, 0.4]} /><meshStandardMaterial color={p.gold} /></mesh>
    </group>
  )
}

function Temperature() {
  const p = usePalette()
  return (
    <mesh name="temperature" position={[0, 3.2, 0]} rotation={[0, Math.PI / 2, 0]}>
      <cylinderGeometry args={[2.4, 2.4, 4.6, 16, 1, false, 0, Math.PI]} />
      <meshStandardMaterial color={p.ink} roughness={0.7} />
    </mesh>
  )
}

function Potentiometer({ live }: { live: ProLive }) {
  const p = usePalette()
  const pos = live.position ?? 0.5
  return (
    <group name="potentiometer">
      <mesh position={[0, 4.5, 0]}><boxGeometry args={[10, 5, 9.5]} /><meshStandardMaterial color={p['wire-blue']} roughness={0.6} /></mesh>
      <group position={[0, 8.2, 0]} rotation={[0, -(pos - 0.5) * Math.PI * 1.5, 0]}>
        <mesh><cylinderGeometry args={[3.2, 3.2, 2.2, 18]} /><meshStandardMaterial color={p.metal} metalness={0.7} roughness={0.4} /></mesh>
        <mesh position={[0, 1.2, 0]}><boxGeometry args={[5.6, 0.4, 0.8]} /><meshStandardMaterial color={p['metal-dark']} /></mesh>
      </group>
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
  const legLen = (name: string) => (part.kind === 'led' ? (name === 'anode' ? 6.5 : 5.2) : part.kind === 'resistor' ? 3.6 : part.kind === 'button' ? 3 : part.kind === 'buzzer' ? 1.5 : 2)
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
      {legs.map((l) => <Leg key={l.name} at={l} len={legLen(l.name)} />)}
      <group position={[c.x, BB_TOP, c.z]} rotation={[0, angle, 0]}>
        {part.kind === 'led' && <Led part={part} live={live} />}
        {part.kind === 'resistor' && <Resistor part={part} span={span} />}
        {part.kind === 'button' && <Button live={live} size={size} />}
        {part.kind === 'buzzer' && <Buzzer live={live} />}
        {part.kind === 'temperature' && <Temperature />}
        {part.kind === 'potentiometer' && <Potentiometer live={live} />}
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
