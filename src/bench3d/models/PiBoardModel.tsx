import { useMemo } from 'react'
import { ExtrudeGeometry, Path, Shape } from 'three'
import { HEADER, PI_BOARD, PI_ORIGIN, PITCH } from '../geometry'
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

/** Een eenvoudig blok op de printplaat. u/v = midden, w langs u, d langs v, h hoogte. */
function Block({ u, v, w, d, h, color, name }: { u: number; v: number; w: number; d: number; h: number; color: PaletteToken; name: string }) {
  const p = usePalette()
  return (
    <mesh name={name} position={[u, PI_BOARD.thickness + h / 2, v]}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={p[color]} roughness={color === 'metal' ? 0.35 : 0.7} metalness={color === 'metal' ? 0.8 : 0.1} />
    </mesh>
  )
}

/**
 * Raspberry Pi 4/5 op ware grootte (85 × 56 mm), opgebouwd uit vormen. Linkerbovenhoek van de printplaat is de oorsprong,
 * met de GPIO-header langs de bovenrand. Bewust zonder logo of merkteken.
 */
export function PiBoardModel(props: PinHeaderProps) {
  const p = usePalette()
  const geometry = useMemo(() => new ExtrudeGeometry(boardShape(), { depth: PI_BOARD.thickness, bevelEnabled: false, curveSegments: 6 }), [])
  const headerCenterU = HEADER.firstU + (19 * PITCH) / 2
  return (
    <group name="pi-board" position={[PI_ORIGIN.x, 0, PI_ORIGIN.z]}>
      {/* De vorm ligt in het xy-vlak; kantelen zodat v naar +z loopt en de plaat van y = 0 tot y = dikte staat. */}
      <mesh geometry={geometry} rotation={[Math.PI / 2, 0, 0]} position={[0, PI_BOARD.thickness, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={p.board} roughness={0.55} />
      </mesh>

      {/* chips */}
      <Block name="soc" u={27} v={30} w={15} d={15} h={1.2} color="metal" />
      <Block name="ram" u={42} v={30} w={12} d={10} h={1} color="ink" />
      <Block name="wifi" u={13} v={22} w={12} d={10} h={2} color="metal" />
      <Block name="usb-controller" u={60} v={18} w={5} d={5} h={0.8} color="ink" />

      {/* poorten rechts: twee USB-stapels en ethernet */}
      <Block name="usb-a-1" u={77.25} v={11.5} w={17.5} d={13.1} h={15.6} color="metal" />
      <Block name="usb-a-2" u={77.25} v={27} w={17.5} d={13.1} h={15.6} color="metal" />
      <Block name="ethernet" u={75.4} v={44} w={21.2} d={16} h={13.5} color="metal" />

      {/* poorten onder: USB-C, twee micro-HDMI en audio */}
      <Block name="usb-c" u={11.2} v={52.85} w={9} d={7.3} h={3.3} color="metal" />
      <Block name="hdmi-1" u={26} v={52.75} w={6.5} d={7.5} h={3} color="metal" />
      <Block name="hdmi-2" u={39.5} v={52.75} w={6.5} d={7.5} h={3} color="metal" />
      <Block name="audio" u={53.5} v={50.25} w={7} d={12.5} h={6} color="ink" />

      {/* kunststof huis van de header */}
      <Block name="header-body" u={headerCenterU} v={HEADER.centerV} w={20 * PITCH} d={2 * PITCH} h={HEADER.bodyHeight} color="ink" />
      <PinHeader {...props} />
    </group>
  )
}
