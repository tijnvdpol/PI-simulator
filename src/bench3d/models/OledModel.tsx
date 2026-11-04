import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { DataTexture, NearestFilter, RGBAFormat } from 'three'
import { PART_ANCHORS } from '../anchors'
import { usePalette } from '../palette'
import type { PartModelProps } from './types'

export const SCREEN_PX = { w: 128, h: 64 } as const
const SCREEN_MM = { w: 22, h: 11 } as const
const MODULE = { w: 27, h: 27, t: 1.2, y0: 3 } as const

/** OLED-module 128 × 64 (SSD1306): staande printplaat met het scherm als textuur en vier pinnen eronder. */
export function OledModel({ live }: PartModelProps) {
  const p = usePalette()
  const invalidate = useThree((s) => s.invalidate)
  const texture = useMemo(() => {
    const t = new DataTexture(new Uint8Array(SCREEN_PX.w * SCREEN_PX.h * 4), SCREEN_PX.w, SCREEN_PX.h, RGBAFormat)
    t.magFilter = NearestFilter // scherpe pixels, geen uitgesmeerd beeld
    t.minFilter = NearestFilter
    t.generateMipmaps = false
    return t
  }, [])
  useEffect(() => () => texture.dispose(), [texture])

  const version = live.display?.version ?? -1
  const on = live.display?.on ?? false
  const contrast = live.display?.contrast ?? 255
  const read = live.readDisplay
  useEffect(() => {
    const data = texture.image.data as unknown as Uint8Array
    const bytes = on && read ? read() : null
    // aan-pixels in de schermkleur (gedimd door het contrast), uit-pixels bijna zwart; rij 0 van een textuur is onderaan
    const lit = [p['oled-on'].r, p['oled-on'].g, p['oled-on'].b].map((c) => Math.round(255 * Math.pow(c, 1 / 2.2) * (0.35 + 0.65 * (contrast / 255))))
    const dark = [10, 12, 16]
    for (let y = 0; y < SCREEN_PX.h; y++) {
      for (let x = 0; x < SCREEN_PX.w; x++) {
        const isOn = bytes !== null && ((bytes[y * 16 + (x >> 3)] >> (7 - (x & 7))) & 1) === 1
        const i = ((SCREEN_PX.h - 1 - y) * SCREEN_PX.w + x) * 4
        const c = isOn ? lit : dark
        data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255
      }
    }
    texture.needsUpdate = true
    invalidate() // de scène tekent alleen als er iets verandert
  }, [texture, version, on, contrast, read, p, invalidate])

  return (
    <group name="oled" userData={{ on, version }}>
      <mesh position={[0, MODULE.y0 + MODULE.h / 2, 0]}>
        <boxGeometry args={[MODULE.w, MODULE.h, MODULE.t]} />
        <meshStandardMaterial color={p.board} roughness={0.7} />
      </mesh>
      <mesh position={[0, MODULE.y0 + MODULE.h / 2 + 1.5, MODULE.t / 2 + 0.1]}>
        <boxGeometry args={[SCREEN_MM.w + 2.4, SCREEN_MM.h + 2.4, 0.3]} />
        <meshStandardMaterial color={p.ink} roughness={0.6} />
      </mesh>
      <mesh name="oled-screen" position={[0, MODULE.y0 + MODULE.h / 2 + 1.5, MODULE.t / 2 + 0.3]}>
        <planeGeometry args={[SCREEN_MM.w, SCREEN_MM.h]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {(['gnd', 'v33', 'scl', 'sda'] as const).map((t) => {
        const [x] = PART_ANCHORS.oled.terminals![t]
        return (
          <mesh key={t} name={`pin-${t}`} position={[x, 1.5, 0]}>
            <boxGeometry args={[0.6, 3, 0.6]} />
            <meshStandardMaterial color={p.metal} metalness={0.8} roughness={0.4} />
          </mesh>
        )
      })}
    </group>
  )
}
