import { RoundedBox } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { ExtrudeGeometry, Path, Shape } from 'three'
import { pcbTexture, type SilkItem } from '../env/pcbTexture'
import { HEADER, PI_BOARD, PI_LIFT, PI_ORIGIN, PITCH } from '../geometry'
import { usePalette, type PaletteToken } from '../palette'
import { PinHeader, type PinHeaderProps } from './PinHeader'

/** Printplaat met afgeronde hoeken en vier montagegaten. Vorm in (u, v); wordt in de scène plat gelegd. */
export function boardShape(): Shape {
  const { width: w, depth: d, cornerRadius: r } = PI_BOARD
  const s = new Shape()
  s.moveTo(r, 0)
  s.lineTo(w - r, 0); s.quadraticCurveTo(w, 0, w, r)
  s.lineTo(w, d - r); s.quadraticCurveTo(w, d, w - r, d)
  s.lineTo(r, d); s.quadraticCurveTo(0, d, 0, d - r)
  s.lineTo(0, r); s.quadraticCurveTo(0, 0, r, 0)
  for (const h of PI_BOARD.holes) {
    const hole = new Path()
    hole.absarc(h.u, h.v, 1.375, 0, Math.PI * 2, true)
    s.holes.push(hole)
  }
  return s
}

/** Teksten en omlijningen op de silkscreen (zelf bedacht; geen logo of merknaam). */
const SILK: SilkItem[] = [
  { u: 27, v: 30, text: '', box: { w: 17, d: 17 } },
  { u: 42, v: 30, text: '', box: { w: 14, d: 12 } },
  { u: 13, v: 22, text: '', box: { w: 14, d: 12 } },
  { u: 5.2, v: 7.6, text: '1', size: 1.3 },
  { u: 5.2, v: 1.3, text: '2', size: 1.3 },
  { u: 53, v: 7.6, text: '39', size: 1.2 },
  { u: 53, v: 1.3, text: '40', size: 1.2 },
  { u: 29, v: 7.8, text: 'GPIO', size: 1.5 },
  { u: 11.2, v: 46.5, text: 'PWR', size: 1.4 },
  { u: 26, v: 46.5, text: 'HDMI0', size: 1.3 },
  { u: 39.5, v: 46.5, text: 'HDMI1', size: 1.3 },
  { u: 53.5, v: 43, text: 'AUDIO', size: 1.3 },
  { u: 60, v: 23.5, text: 'USB', size: 1.3 },
  { u: 6, v: 36, text: 'SD', size: 1.5 },
  { u: 20, v: 36, text: 'CPU', size: 1.4 },
  { u: 42, v: 37.8, text: 'RAM', size: 1.4 },
  { u: 73, v: 51, text: 'LAN', size: 1.4 },
  { u: 24, v: 14, text: 'WLAN', size: 1.3 },
]

interface BlockProps { u: number; v: number; w: number; d: number; h: number; color: PaletteToken; name: string; radius?: number; y?: number }

/** Een afgerond blok op de printplaat. u/v = midden, w langs u, d langs v, h hoogte; `y` = onderkant boven de plaat. */
function Block({ u, v, w, d, h, color, name, radius = 0.4, y = 0 }: BlockProps) {
  const p = usePalette()
  const metal = color === 'metal'
  return (
    <RoundedBox name={name} args={[w, h, d]} radius={Math.min(radius, h / 2.2, w / 2.2, d / 2.2)} smoothness={3} position={[u, PI_BOARD.thickness + y + h / 2, v]} castShadow receiveShadow>
      <meshStandardMaterial color={p[color]} roughness={metal ? 0.28 : 0.6} metalness={metal ? 1 : 0.05} />
    </RoundedBox>
  )
}

/** Donkere opening of ander detail op het vlak van een poort. `side`: welke kant van de plaat het vlak naar kijkt. */
function Dark({ x, y, z, w, h, d, color = 'ink', emissive }: { x: number; y: number; z: number; w: number; h: number; d: number; color?: PaletteToken; emissive?: PaletteToken }) {
  const p = usePalette()
  return (
    <mesh position={[x, y, z]}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={p[color]} roughness={0.5} emissive={emissive ? p[emissive] : p.ink} emissiveIntensity={emissive ? 0.7 : 0} />
    </mesh>
  )
}

const T = PI_BOARD.thickness

/** Stapel van twee USB-A-poorten, openingen naar +u. `blue` = USB 3 (blauwe binnenkant), anders USB 2 (zwart). */
function UsbStack({ name, u, v, blue }: { name: string; u: number; v: number; blue: boolean }) {
  const w = 17.5, d = 13.1, h = 15.6
  const face = u + w / 2 + 0.03
  return (
    <group name={name}>
      <Block name={`${name}-housing`} u={u} v={v} w={w} d={d} h={h} color="metal" radius={0.5} />
      {[3.9, 11.7].map((y) => (
        <group key={y}>
          <Dark x={face} y={T + y} z={v} w={0.1} h={5.8} d={12.2} />
          <Dark x={face - 0.5} y={T + y - 0.6} z={v} w={0.4} h={1.6} d={10.8} color={blue ? 'led-blue' : 'metal-dark'} />
        </group>
      ))}
    </group>
  )
}

/**
 * Raspberry Pi 4/5 op ware grootte (85 × 56 mm), opgebouwd uit afgeronde vormen. Linkerbovenhoek van de printplaat is de
 * oorsprong, met de GPIO-header langs de bovenrand. Bewust zonder logo of merkteken. De plaat staat op vier voetjes.
 */
export function PiBoardModel(props: PinHeaderProps) {
  const p = usePalette()
  const geometry = useMemo(() => new ExtrudeGeometry(boardShape(), { depth: PI_BOARD.thickness, bevelEnabled: false, curveSegments: 8 }), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  const map = useMemo(() => {
    const t = pcbTexture(PI_BOARD.width, PI_BOARD.depth, { mask: p.board, silk: p.fg, pad: p.gold, silkItems: SILK, header: true, seed: 11 })
    t?.repeat.set(1 / PI_BOARD.width, 1 / PI_BOARD.depth)
    return t
  }, [p])
  useEffect(() => () => map?.dispose(), [map])
  const headerCenterU = HEADER.firstU + (19 * PITCH) / 2
  return (
    <group name="pi-board" position={[PI_ORIGIN.x, PI_LIFT, PI_ORIGIN.z]}>
      {/* vier rubber voetjes onder de montagegaten: de printplaat zweeft een paar mm boven de mat */}
      {PI_BOARD.holes.map((h, i) => (
        <mesh key={i} name="foot" position={[h.u, -PI_LIFT / 2, h.v]} castShadow receiveShadow>
          <cylinderGeometry args={[3, 3.4, PI_LIFT, 20]} />
          <meshStandardMaterial color={p.ink} roughness={0.85} />
        </mesh>
      ))}
      {/* De vorm ligt in het xy-vlak; kantelen zodat v naar +z loopt en de plaat van y = 0 tot y = dikte staat. */}
      <mesh name="pcb" geometry={geometry} rotation={[Math.PI / 2, 0, 0]} position={[0, PI_BOARD.thickness, 0]} castShadow receiveShadow>
        {/* UV's van de bovenkant zijn in mm; de textuur wordt daarom per plaatafmeting herhaald */}
        <meshPhysicalMaterial color={p.board} map={map} roughness={0.5} clearcoat={0.18} clearcoatRoughness={0.45} />
      </mesh>
      {/* gouden ringen om de montagegaten */}
      {PI_BOARD.holes.map((h, i) => (
        <mesh key={i} name="mounting-ring" position={[h.u, PI_BOARD.thickness + 0.03, h.v]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.4, 2.5, 24]} />
          <meshStandardMaterial color={p.gold} metalness={1} roughness={0.3} />
        </mesh>
      ))}

      {/* SoC met metalen kapje, RAM, wifi-afscherming en USB-controller */}
      <group name="soc">
        <Block name="soc-package" u={27} v={30} w={15} d={15} h={0.9} color="ink" radius={0.3} />
        <Block name="soc-cap" u={27} v={30} w={12.6} d={12.6} h={0.7} color="metal" radius={0.4} y={0.9} />
      </group>
      <Block name="ram" u={42} v={30} w={12} d={10} h={1} color="ink" />
      <Block name="wifi" u={13} v={22} w={12} d={10} h={2} color="metal" radius={0.3} />
      <Block name="usb-controller" u={60} v={18} w={5} d={5} h={0.8} color="ink" radius={0.2} />

      {/* poorten rechts: twee USB-stapels en ethernet */}
      <UsbStack name="usb-a-1" u={77.25} v={11.5} blue={false} />
      <UsbStack name="usb-a-2" u={77.25} v={27} blue />
      <group name="ethernet">
        <Block name="ethernet-housing" u={75.4} v={44} w={21.2} d={16} h={13.5} color="metal" radius={0.5} />
        <Dark x={75.4 + 10.6 + 0.03} y={T + 6.6} z={44} w={0.1} h={9.6} d={13.4} />
        <Dark x={75.4 + 10.6 - 0.4} y={T + 2.6} z={44} w={0.4} h={1.2} d={11} color="gold" />
        {/* twee lampjes boven de opening */}
        <Dark x={75.4 + 10.6 + 0.05} y={T + 12.2} z={44 - 5.6} w={0.1} h={1.2} d={1.8} color="led-green" emissive="led-green" />
        <Dark x={75.4 + 10.6 + 0.05} y={T + 12.2} z={44 + 5.6} w={0.1} h={1.2} d={1.8} color="led-yellow" emissive="led-yellow" />
      </group>

      {/* poorten onder (openingen naar +v): USB-C, twee micro-HDMI en audio */}
      <group name="usb-c">
        <Block name="usb-c-housing" u={11.2} v={52.85} w={9} d={7.3} h={3.3} color="metal" radius={0.6} />
        <Dark x={11.2} y={T + 1.65} z={52.85 + 3.65 + 0.03} w={7.2} h={1.7} d={0.1} />
      </group>
      {[{ n: 'hdmi-1', u: 26 }, { n: 'hdmi-2', u: 39.5 }].map((h) => (
        <group key={h.n} name={h.n}>
          <Block name={`${h.n}-housing`} u={h.u} v={52.75} w={6.5} d={7.5} h={3} color="metal" radius={0.5} />
          <Dark x={h.u} y={T + 1.5} z={52.75 + 3.75 + 0.03} w={5.2} h={1.4} d={0.1} />
        </group>
      ))}
      <group name="audio">
        <Block name="audio-housing" u={53.5} v={50.25} w={7} d={12.5} h={6} color="ink" radius={0.8} />
        <mesh position={[53.5, T + 3.2, 50.25 + 6.25 + 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.5, 1.5, 0.1, 14]} />
          <meshStandardMaterial color={p['metal-dark']} roughness={0.4} metalness={0.8} />
        </mesh>
      </group>
      {/* SD-kaartslot aan de onderkant, steekt aan de linkerrand uit */}
      <mesh name="sd-slot" position={[2.5, -1.1, 28]} castShadow>
        <boxGeometry args={[13, 1.5, 12]} />
        <meshStandardMaterial color={p.metal} metalness={1} roughness={0.32} />
      </mesh>

      {/* kunststof huis van de header */}
      <Block name="header-body" u={headerCenterU} v={HEADER.centerV} w={20 * PITCH} d={2 * PITCH} h={HEADER.bodyHeight} color="ink" radius={0.25} />
      <PinHeader {...props} />
    </group>
  )
}
