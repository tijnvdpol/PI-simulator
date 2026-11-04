import { Grid } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { TABLE, MM } from './geometry'
import { usePalette } from './palette'

export const TABLE_W = TABLE.svgW / MM
export const TABLE_D = TABLE.svgH / MM

/** Donkere werktafel (kleur van de achtergrond van de app) met een subtiel raster van 4 mm. Het bovenvlak ligt op y = 0. */
export function Table(props: { onPointerMove?: (e: ThreeEvent<PointerEvent>) => void; onClick?: (e: ThreeEvent<MouseEvent>) => void }) {
  const p = usePalette()
  return (
    <group name="table">
      <mesh position={[0, -2, 0]} receiveShadow {...props}>
        <boxGeometry args={[TABLE_W + 12, 4, TABLE_D + 12]} />
        <meshStandardMaterial color={p.bg} roughness={0.9} />
      </mesh>
      <Grid
        position={[0, 0.02, 0]}
        args={[TABLE_W + 12, TABLE_D + 12]}
        cellSize={TABLE.gridSvg / MM}
        cellThickness={0.5}
        cellColor={p.line}
        sectionSize={20}
        sectionThickness={0.9}
        sectionColor={p.line}
        fadeDistance={400}
        fadeStrength={1}
      />
    </group>
  )
}
