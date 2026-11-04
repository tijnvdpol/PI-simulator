import type { ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { TABLE, MM } from './geometry'
import { usePalette } from './palette'
import { matTexture } from './env/canvasTextures'

export const TABLE_W = TABLE.svgW / MM
export const TABLE_D = TABLE.svgH / MM
/** De snijmat steekt rondom zoveel mm voorbij het werkgebied uit. */
export const MAT_MARGIN = { x: 60, z: 50 }
export const MAT_THICKNESS = 1.5

/**
 * De snijmat waarop alles staat, met een fijn raster en cm-markeringen. Het bovenvlak ligt op y = 0; het houten
 * werkbankblad eronder staat in `Workshop`. `width` × `depth` is het werkgebied, de mat is daar rondom wat groter.
 */
export function Table({ width = TABLE_W, depth = TABLE_D, center = [0, 0], ...props }: { onPointerMove?: (e: ThreeEvent<PointerEvent>) => void; onClick?: (e: ThreeEvent<MouseEvent>) => void; width?: number; depth?: number; center?: [number, number] }) {
  const p = usePalette()
  const w = width + 2 * MAT_MARGIN.x
  const d = depth + 2 * MAT_MARGIN.z
  const map = useMemo(() => matTexture(w, d, p.mat, p['mat-line']), [w, d, p])
  useEffect(() => () => map?.dispose(), [map])
  return (
    <group name="table" position={[center[0], 0, center[1]]}>
      <mesh position={[0, -MAT_THICKNESS / 2, 0]} receiveShadow {...props}>
        <boxGeometry args={[w, MAT_THICKNESS, d]} />
        <meshStandardMaterial color={p.mat} roughness={0.82} metalness={0} map={map} />
      </mesh>
    </group>
  )
}
