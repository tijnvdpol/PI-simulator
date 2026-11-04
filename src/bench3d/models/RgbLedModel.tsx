import { useMemo } from 'react'
import { Color, SRGBColorSpace } from 'three'
import { PART_ANCHORS } from '../anchors'
import { usePalette } from '../palette'
import type { PartModelProps } from './types'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Mengkleur van de drie niveaus (0–1). Zo wordt (1, 0,5, 0) oranje, zoals je het op een scherm zou verwachten. */
export function mixColor([r, g, b]: [number, number, number]): Color {
  return new Color().setRGB(clamp01(r), clamp01(g), clamp01(b), SRGBColorSpace)
}

const LEGS = ['r', 'gnd', 'g', 'b'] as const

/** RGB-led van 5 mm met vier pootjes (R, GND, G, B). De koepel krijgt de gemengde kleur. */
export function RgbLedModel({ live }: PartModelProps) {
  const p = usePalette()
  const rgb = live.rgb ?? [0, 0, 0]
  const level = Math.max(clamp01(rgb[0]), clamp01(rgb[1]), clamp01(rgb[2]))
  const color = useMemo(() => mixColor([rgb[0], rgb[1], rgb[2]]), [rgb[0], rgb[1], rgb[2]]) // eslint-disable-line react-hooks/exhaustive-deps
  const on = level > 0
  const body = (
    <meshStandardMaterial color={on ? color : p.fg} emissive={color} emissiveIntensity={on ? 0.35 + 0.65 * level : 0} transparent opacity={on ? 1 : 0.6} roughness={0.35} />
  )
  return (
    <group name="rgbled" userData={{ rgb: [...rgb] }}>
      {LEGS.map((t) => {
        const [x] = PART_ANCHORS.rgbled.terminals![t]
        return (
          <mesh key={t} name={`leg-${t}`} position={[x, t === 'gnd' ? 5 : 4, 0]}>
            <boxGeometry args={[0.5, t === 'gnd' ? 10 : 8, 0.5]} />
            <meshStandardMaterial color={p.metal} metalness={0.8} roughness={0.4} />
          </mesh>
        )
      })}
      <group position={[0, 10, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[2.9, 2.9, 1, 16]} />
          {body}
        </mesh>
        <mesh position={[0, 4.5, 0]}>
          <cylinderGeometry args={[2.5, 2.5, 7, 16]} />
          {body}
        </mesh>
        <mesh name="rgb-dome" position={[0, 8, 0]}>
          <sphereGeometry args={[2.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          {body}
        </mesh>
      </group>
      <pointLight name="rgb-light" position={[0, 20, 0]} color={color} intensity={level * 400} distance={60} decay={2} />
    </group>
  )
}
