/**
 * De "lichamen" van de onderdelen (zonder pootjes of plek): één keer gebouwd, gebruikt door de simpele werkbank
 * (`models/*Model.tsx`) én de pro-werkbank (`pro/ProParts.tsx`). Alles in mm, y = omhoog.
 * Materialen volgen het thema (`usePalette`); er staan geen vaste kleuren in.
 */
import { RoundedBox } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { Color, DoubleSide, type BufferGeometry } from 'three'
import { useQuality } from '../env/quality'
import { usePalette } from '../palette'
import { LED, ledEpoxyGeometry, ledFlangeGeometry, legGeometry, resistorBodyGeometry, ribbedKnobGeometry, to92Geometry } from './shapes'

/** Een zilveren pootje langs een reeks punten (lokale coördinaten). */
export function Leg({ points, radius = 0.28, name }: { points: ReadonlyArray<readonly [number, number, number]>; radius?: number; name?: string }) {
  const p = usePalette()
  const key = points.map((q) => q.join(',')).join('|')
  const geometry = useMemo(() => legGeometry(points, radius, 14), [key, radius]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh name={name} geometry={geometry} castShadow>
      <meshStandardMaterial color={p.metal} metalness={1} roughness={0.28} />
    </mesh>
  )
}

/** Een geometrie die bij het weggooien wordt opgeruimd. */
function useGeo(make: () => BufferGeometry, deps: unknown[]): BufferGeometry {
  const g = useMemo(make, deps) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => g.dispose(), [g])
  return g
}

/**
 * Led van 5 mm. y = 0 is de onderkant van het randje (flens); de top van de koepel ligt op y ≈ 9,3.
 * De kathodezijde (kortere poot) is +x en heeft de platte kant. Doorschijnend epoxy (transmission) met zichtbare binnenkant,
 * ook als hij uit is. Aan: emissive boven 1 voor de bloom. Kapot: zwart en dof.
 */
export function LedBody({ color, level, burnt = false }: { color: Color; level: number; burnt?: boolean }) {
  const p = usePalette()
  const quality = useQuality()
  const on = !burnt && level > 0
  const glow = on ? 0.35 + 1.15 * level : 0
  const epoxy = useGeo(() => ledEpoxyGeometry(), [])
  const flange = useGeo(() => ledFlangeGeometry(), [])
  const base = burnt ? p.ink : color
  const high = quality === 'high' && !burnt
  return (
    <group name="led-body">
      <mesh name="led-flange" geometry={flange} castShadow>
        <meshPhysicalMaterial color={base} emissive={base} emissiveIntensity={glow * 0.6} roughness={burnt ? 0.95 : 0.25} transparent={!burnt} opacity={burnt ? 1 : 0.9} />
      </mesh>
      <mesh name="led-epoxy" geometry={epoxy} position={[0, LED.flangeThick, 0]} castShadow>
        <meshPhysicalMaterial
          color={base} emissive={base} emissiveIntensity={glow}
          roughness={burnt ? 0.95 : 0.1} ior={1.5} clearcoat={burnt ? 0 : 1} clearcoatRoughness={0.1}
          transmission={high ? 0.85 : 0} thickness={high ? 4 : 0} attenuationColor={base} attenuationDistance={high ? 3 : Infinity}
          transparent={!high && !burnt} opacity={high || burnt ? 1 : 0.62}
          side={DoubleSide}
        />
      </mesh>
      {/* binnenkant: het draadframe (aambeeld + opstaande pen) en het chipje, ook als de led uit is te zien */}
      <mesh name="led-frame" position={[-0.6, LED.flangeThick + 1.9, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 3.8, 6]} />
        <meshStandardMaterial color={p.metal} metalness={1} roughness={0.3} />
      </mesh>
      <mesh name="led-cup" position={[0, LED.flangeThick + 3.9, 0]}>
        <cylinderGeometry args={[0.95, 0.45, 0.9, 10]} />
        <meshStandardMaterial color={p.metal} metalness={1} roughness={0.3} />
      </mesh>
      <mesh name="led-die" position={[0, LED.flangeThick + 4.35, 0]}>
        <boxGeometry args={[0.45, 0.25, 0.45]} />
        <meshStandardMaterial color={burnt ? p.ink : p.gold} emissive={base} emissiveIntensity={on ? 2 + level : 0} roughness={0.4} />
      </mesh>
    </group>
  )
}

/**
 * Weerstand (as langs x, midden = oorsprong): beige lichaam met vier kleurringen. De ringen heten `band-0…3`.
 */
export function ResistorBody({ bands, length = 6.3 }: { bands: readonly string[]; length?: number }) {
  const p = usePalette()
  const body = useGeo(() => resistorBodyGeometry(length), [length])
  // De ringen zitten op het smalle midden, niet op de dikkere uiteinden.
  const xs = [-1.3, -0.62, 0.06, 1.25].map((x) => (x * length) / 6.3)
  return (
    <group name="resistor-body">
      <mesh geometry={body} castShadow receiveShadow>
        <meshStandardMaterial color={p.resistor} roughness={0.62} />
      </mesh>
      {bands.map((b, i) => (
        <mesh key={i} name={`band-${i}`} position={[xs[i], 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[1.32, 1.32, i === 3 ? 0.5 : 0.55, 16]} />
          <meshStandardMaterial color={p[`band-${b}` as `band-black`]} roughness={0.5} metalness={b === 'gold' ? 0.8 : 0} />
        </mesh>
      ))}
    </group>
  )
}

export const BUTTON_CAP = { rest: 5.0, travel: 0.8 } as const

/**
 * Drukknop 6 × 6 mm (tactile switch): zwart huis, metalen bovenplaat met rondom afgeronde hoeken en een zwarte kap
 * die naar beneden gaat als hij ingedrukt is. De kap heet `button-cap`.
 */
export function ButtonBody({ pressed, w = 6, d = 6 }: { pressed: boolean; w?: number; d?: number }) {
  const p = usePalette()
  return (
    <group name="button-body">
      <RoundedBox args={[w, 3.2, d]} radius={0.3} smoothness={3} position={[0, 1.6 + 1.2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={p.ink} roughness={0.55} />
      </RoundedBox>
      <RoundedBox args={[w - 0.3, 0.35, d - 0.3]} radius={0.15} smoothness={2} position={[0, 4.4 + 0.175, 0]} castShadow>
        <meshStandardMaterial color={p.metal} metalness={1} roughness={0.3} />
      </RoundedBox>
      <mesh name="button-cap" position={[0, BUTTON_CAP.rest - (pressed ? BUTTON_CAP.travel : 0), 0]} castShadow>
        <cylinderGeometry args={[1.75, 1.85, 1.5, 18]} />
        <meshStandardMaterial color={p.ink} roughness={0.35} />
      </mesh>
    </group>
  )
}

/** Buzzer: zwarte cilinder met een gaatje bovenin en een "+"-markering. Het gaatje licht op als hij piept. */
export function BuzzerBody({ active }: { active: boolean }) {
  const p = usePalette()
  return (
    <group name="buzzer-body">
      <mesh position={[0, 4.75, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[6, 6.15, 9.5, 28]} />
        <meshStandardMaterial color={p.ink} roughness={0.55} />
      </mesh>
      <mesh position={[0, 9.45, 0]}>
        <cylinderGeometry args={[5.7, 6, 0.3, 28]} />
        <meshStandardMaterial color={p.ink} roughness={0.4} />
      </mesh>
      <mesh name="buzzer-hole" position={[0, 9.62, 0]}>
        <cylinderGeometry args={[1.15, 1.15, 0.2, 14]} />
        <meshStandardMaterial color={active ? p.accent : p['metal-dark']} emissive={p.accent} emissiveIntensity={active ? 1.6 : 0} roughness={0.5} />
      </mesh>
      {/* "+" naast de plus-poot */}
      <mesh position={[-3.9, 9.64, 0]}><boxGeometry args={[1.5, 0.12, 0.35]} /><meshStandardMaterial color={p.fg} roughness={0.6} /></mesh>
      <mesh position={[-3.9, 9.64, 0]}><boxGeometry args={[0.35, 0.12, 1.5]} /><meshStandardMaterial color={p.fg} roughness={0.6} /></mesh>
    </group>
  )
}

/** Temperatuursensor in een TO-92-huisje: zwarte halve cilinder met de platte kant naar +z en een opdruk. y = 0 is de onderkant. */
export function Temperature92Body() {
  const p = usePalette()
  const body = useGeo(() => to92Geometry(), [])
  return (
    <group name="temperature-body">
      <mesh geometry={body} castShadow receiveShadow>
        <meshStandardMaterial color={p.ink} roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.4, 0.02]}><boxGeometry args={[2.6, 0.18, 0.04]} /><meshStandardMaterial color={p['fg-muted']} roughness={0.7} /></mesh>
    </group>
  )
}

/** Draaiknop-potmeter: blauw huis, metalen bus en een geribbelde knop met een standstreep. De knop heet `knob`. */
export function PotentiometerBody({ angle }: { angle: number }) {
  const p = usePalette()
  const knob = useGeo(() => ribbedKnobGeometry(), [])
  return (
    <group name="pot-body">
      <RoundedBox args={[10, 3.4, 9]} radius={0.5} smoothness={3} position={[0, 1.7, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={p.bin} roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, 3.9, 0]} castShadow>
        <cylinderGeometry args={[3, 3, 1.4, 20]} />
        <meshStandardMaterial color={p.metal} metalness={1} roughness={0.28} />
      </mesh>
      <group name="knob" position={[0, 4.6, 0]} rotation={[0, angle, 0]}>
        <mesh geometry={knob} position={[0, 2, 0]} castShadow>
          <meshStandardMaterial color={p.ink} roughness={0.45} />
        </mesh>
        <mesh position={[0, 4.03, -2.6]}><boxGeometry args={[0.8, 0.12, 3.4]} /><meshStandardMaterial color={p.fg} roughness={0.5} /></mesh>
      </group>
    </group>
  )
}

/** Trimpotmeter: blauw huisje met een kruiskop-schroef die meedraait. De schroef heet `knob`. */
export function TrimmerBody({ angle }: { angle: number }) {
  const p = usePalette()
  return (
    <group name="trimmer-body">
      <RoundedBox args={[9.5, 4.6, 9.5]} radius={0.5} smoothness={3} position={[0, 2.3, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={p.bin} roughness={0.45} />
      </RoundedBox>
      <group name="knob" position={[0, 4.65, 0]} rotation={[0, angle, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[3.2, 3.2, 0.9, 24]} />
          <meshStandardMaterial color={p.metal} metalness={1} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.47, 0]}><boxGeometry args={[4.8, 0.2, 0.8]} /><meshStandardMaterial color={p['metal-dark']} metalness={0.8} roughness={0.5} /></mesh>
        <mesh position={[0, 0.47, 0]}><boxGeometry args={[0.8, 0.2, 4.8]} /><meshStandardMaterial color={p['metal-dark']} metalness={0.8} roughness={0.5} /></mesh>
      </group>
    </group>
  )
}
