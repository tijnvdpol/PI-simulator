import { ContactShadows, Environment, useTexture } from '@react-three/drei'
import { Suspense, useEffect, useMemo } from 'react'
import { CatmullRomCurve3, Object3D, RepeatWrapping, SRGBColorSpace, Vector3, type Texture } from 'three'
import { MAT_MARGIN, MAT_THICKNESS, TABLE_D, TABLE_W } from '../Table'
import { usePalette, type PaletteToken } from '../palette'
import { pegboardTexture } from './canvasTextures'
import { useQuality } from './quality'

const ASSETS = `${import.meta.env.BASE_URL}assets`
export const HDRI_URL = `${ASSETS}/env/carpentry_shop_02_1k.hdr`
const WOOD = { diff: `${ASSETS}/tex/wood_diff.webp`, rough: `${ASSETS}/tex/wood_rough.webp`, normal: `${ASSETS}/tex/wood_nor_gl.webp` }

/** Maten van het werkbankblad en de muur erachter (mm). */
export const BENCH = { w: 860, d: 480, thickness: 38 }
const WALL = { w: 1100, h: 420 }

function Part({ pos, size, color, rough = 0.6, metal = 0, rot, name }: { pos: [number, number, number]; size: [number, number, number]; color: PaletteToken; rough?: number; metal?: number; rot?: [number, number, number]; name?: string }) {
  const p = usePalette()
  return (
    <mesh name={name} position={pos} rotation={rot} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={p[color]} roughness={rough} metalness={metal} />
    </mesh>
  )
}

function Cyl({ pos, r, h, color, rough = 0.6, metal = 0, rot, seg = 20, r2 }: { pos: [number, number, number]; r: number; h: number; color: PaletteToken; rough?: number; metal?: number; rot?: [number, number, number]; seg?: number; r2?: number }) {
  const p = usePalette()
  return (
    <mesh position={pos} rotation={rot} castShadow receiveShadow>
      <cylinderGeometry args={[r2 ?? r, r, h, seg]} />
      <meshStandardMaterial color={p[color]} roughness={rough} metalness={metal} />
    </mesh>
  )
}

/** Houten werkbankblad met PBR-textuur (Poly Haven, CC0). Laadt na de eerste weergave; tot dan staat er een effen blad. */
function WoodTop({ cx, cz }: { cx: number; cz: number }) {
  const [diff, rough, normal] = useTexture([WOOD.diff, WOOD.rough, WOOD.normal]) as Texture[]
  useMemo(() => {
    for (const t of [diff, rough, normal]) { t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(BENCH.w / 500, BENCH.d / 500); t.anisotropy = 8 }
    diff.colorSpace = SRGBColorSpace
  }, [diff, rough, normal])
  return (
    <mesh position={[cx, -MAT_THICKNESS - BENCH.thickness / 2, cz]} receiveShadow>
      <boxGeometry args={[BENCH.w, BENCH.thickness, BENCH.d]} />
      <meshStandardMaterial map={diff} roughnessMap={rough} normalMap={normal} roughness={1} />
    </mesh>
  )
}

function PlainTop({ cx, cz }: { cx: number; cz: number }) {
  const p = usePalette()
  return (
    <mesh position={[cx, -MAT_THICKNESS - BENCH.thickness / 2, cz]} receiveShadow>
      <boxGeometry args={[BENCH.w, BENCH.thickness, BENCH.d]} />
      <meshStandardMaterial color={p.wood} roughness={0.8} />
    </mesh>
  )
}

/** Muur met pegboard en wat gereedschap, laag-poly en zelf opgebouwd. */
function Wall({ cx, wallZ }: { cx: number; wallZ: number }) {
  const p = usePalette()
  const tex = useMemo(() => {
    const t = pegboardTexture(p.pegboard, p['peg-hole'], 100)
    t?.repeat.set(560 / 100, 250 / 100)
    return t
  }, [p])
  useEffect(() => () => tex?.dispose(), [tex])
  const baseY = -MAT_THICKNESS
  const boardY = baseY + 150
  const front = wallZ + 7
  return (
    <group name="workshop-wall">
      <mesh position={[cx, baseY + WALL.h / 2, wallZ]} receiveShadow>
        <boxGeometry args={[WALL.w, WALL.h, 8]} />
        <meshStandardMaterial color={p.wall} roughness={0.95} />
      </mesh>
      <mesh position={[cx, boardY, wallZ + 6]} castShadow receiveShadow>
        <boxGeometry args={[560, 250, 6]} />
        <meshStandardMaterial color={p.pegboard} map={tex} roughness={0.9} />
      </mesh>
      {/* tang aan twee haken */}
      <group position={[cx - 190, boardY + 20, front + 8]}>
        <Part pos={[-4, -34, 0]} size={[7, 70, 6]} color="tool-red" rough={0.55} rot={[0, 0, 0.08]} />
        <Part pos={[4, -34, 0]} size={[7, 70, 6]} color="tool-red" rough={0.55} rot={[0, 0, -0.08]} />
        <Part pos={[0, 12, 0]} size={[20, 26, 7]} color="metal" metal={0.9} rough={0.3} />
        <Part pos={[0, 34, 0]} size={[10, 18, 7]} color="metal" metal={0.9} rough={0.3} />
      </group>
      {/* zijsnijtang */}
      <group position={[cx - 150, boardY + 12, front + 8]}>
        <Part pos={[-4, -30, 0]} size={[6, 64, 6]} color="tool-yellow" rough={0.55} rot={[0, 0, 0.1]} />
        <Part pos={[4, -30, 0]} size={[6, 64, 6]} color="tool-yellow" rough={0.55} rot={[0, 0, -0.1]} />
        <Part pos={[0, 8, 0]} size={[18, 22, 6]} color="metal" metal={0.9} rough={0.3} />
      </group>
      {/* rol draad op een stang */}
      <group position={[cx + 60, boardY + 20, front + 12]}>
        <Cyl pos={[0, 0, -3]} r={2} h={22} color="metal" metal={0.9} rough={0.3} rot={[Math.PI / 2, 0, 0]} />
        <Cyl pos={[0, 0, 4]} r={26} h={6} color="bin" rough={0.5} rot={[Math.PI / 2, 0, 0]} seg={28} />
        <Cyl pos={[0, 0, 11]} r={22} h={10} color="wire-red" rough={0.45} rot={[Math.PI / 2, 0, 0]} seg={28} />
        <Cyl pos={[0, 0, 18]} r={26} h={6} color="bin" rough={0.5} rot={[Math.PI / 2, 0, 0]} seg={28} />
      </group>
      {/* schaar */}
      <group position={[cx + 170, boardY + 10, front + 8]}>
        <Part pos={[-5, -30, 0]} size={[9, 60, 4]} color="metal" metal={0.9} rough={0.3} rot={[0, 0, 0.12]} />
        <Part pos={[5, -30, 0]} size={[9, 60, 4]} color="metal" metal={0.9} rough={0.3} rot={[0, 0, -0.12]} />
        <Part pos={[-10, 20, 0]} size={[14, 30, 5]} color="lamp" rough={0.7} rot={[0, 0, 0.12]} />
        <Part pos={[10, 20, 0]} size={[14, 30, 5]} color="lamp" rough={0.7} rot={[0, 0, -0.12]} />
      </group>
    </group>
  )
}

/** Soldeerbout in houder, op het werkbankblad naast de mat. */
function SolderingStation({ x, z }: { x: number; z: number }) {
  const y = -MAT_THICKNESS
  return (
    <group name="soldering-station" position={[x, y, z]}>
      <Cyl pos={[0, 5, 0]} r={26} h={10} color="lamp" rough={0.6} seg={28} />
      <Cyl pos={[0, 22, 0]} r={3} h={36} color="metal" metal={0.9} rough={0.3} />
      <Part pos={[0, 40, 0]} size={[22, 5, 8]} color="metal" metal={0.9} rough={0.35} />
      {/* bout: handvat leunt schuin in de houder */}
      <group position={[0, 40, 0]} rotation={[0, 0, -0.55]}>
        <Cyl pos={[0, 40, 0]} r={6} h={70} color="tool-red" rough={0.5} />
        <Cyl pos={[0, -4, 0]} r={2.4} h={20} color="metal" metal={0.9} rough={0.25} r2={1.2} />
      </group>
    </group>
  )
}

/** Klein bakje met onderdelen, links op het werkbankblad. */
function PartsBin({ x, z }: { x: number; z: number }) {
  const y = -MAT_THICKNESS
  return (
    <group name="parts-bin" position={[x, y, z]}>
      <Part pos={[0, 2, 0]} size={[90, 4, 55]} color="bin" rough={0.5} />
      <Part pos={[0, 11, 27]} size={[90, 14, 3]} color="bin" rough={0.5} />
      <Part pos={[0, 11, -27]} size={[90, 14, 3]} color="bin" rough={0.5} />
      <Part pos={[44, 11, 0]} size={[3, 14, 55]} color="bin" rough={0.5} />
      <Part pos={[-44, 11, 0]} size={[3, 14, 55]} color="bin" rough={0.5} />
      <Part pos={[-18, 8, 4]} size={[16, 4, 6]} color="resistor" rough={0.6} rot={[0, 0.4, 0]} />
      <Part pos={[8, 8, -6]} size={[16, 4, 6]} color="resistor" rough={0.6} rot={[0, -0.3, 0]} />
      <Part pos={[20, 8, 10]} size={[10, 4, 6]} color="led-blue" rough={0.3} rot={[0, 1.1, 0]} />
    </group>
  )
}

/** Werklamp op de hoek van het blad, met de bol van de spot op de plek van de lamp. */
function Lamp({ base, head }: { base: Vector3; head: Vector3 }) {
  const p = usePalette()
  const arm = useMemo(() => {
    const mid = new Vector3((base.x + head.x) / 2 - 30, Math.max(base.y, head.y) + 70, (base.z + head.z) / 2)
    return new CatmullRomCurve3([base.clone().setY(base.y + 12), new Vector3(base.x, base.y + 130, base.z), mid, head.clone().setY(head.y + 18)])
  }, [base, head])
  const dir = new Vector3(0, -1, 0)
  return (
    <group name="work-lamp">
      <Cyl pos={[base.x, base.y + 4, base.z]} r={32} h={8} color="lamp" rough={0.5} metal={0.4} seg={28} />
      <mesh castShadow>
        <tubeGeometry args={[arm, 40, 3.2, 8, false]} />
        <meshStandardMaterial color={p.lamp} roughness={0.5} metalness={0.5} />
      </mesh>
      <group position={head.toArray()} rotation={[0.35, 0, -0.5]}>
        <Cyl pos={[0, 8, 0]} r={9} r2={46} h={44} color="lamp" rough={0.45} metal={0.5} seg={32} />
        <mesh position={dir.clone().multiplyScalar(-2).toArray()}>
          <sphereGeometry args={[11, 16, 12]} />
          <meshBasicMaterial color={p['lamp-glow']} />
        </mesh>
      </group>
    </group>
  )
}

/**
 * De werkplaats om de werkbank heen: houten blad, muur met pegboard en gereedschap, een werklamp met warme spot
 * (de enige lamp met echte schaduwen), een HDRI voor reflecties en contactschaduwen onder alles wat op de mat staat.
 * `center` is het midden van de mat, `area` het werkgebied (mm).
 */
export function Workshop({ center, area = { w: TABLE_W, d: TABLE_D } }: { center: [number, number]; area?: { w: number; d: number } }) {
  const quality = useQuality()
  const [cx, cz] = center
  const wallZ = cz - BENCH.d / 2 + 6
  const matW = area.w + 2 * MAT_MARGIN.x
  const matD = area.d + 2 * MAT_MARGIN.z
  const base = useMemo(() => new Vector3(cx - matW / 2 - 40, -MAT_THICKNESS, cz - matD / 2 - 10), [cx, cz, matW, matD])
  const head = useMemo(() => new Vector3(cx - 150, 215, cz - 60), [cx, cz])
  const p = usePalette()
  const target = useMemo(() => { const o = new Object3D(); o.position.set(cx, 0, cz); return o }, [cx, cz])
  const high = quality === 'high'
  return (
    <>
      <Suspense fallback={<PlainTop cx={cx} cz={cz} />}>
        <WoodTop cx={cx} cz={cz} />
      </Suspense>
      <Wall cx={cx} wallZ={wallZ} />
      <SolderingStation x={cx + matW / 2 + 70} z={cz - matD / 2 - 5} />
      <PartsBin x={cx + matW / 2 + 70} z={cz + 20} />
      <Lamp base={base} head={head} />
      <primitive object={target} />
      <spotLight
        position={head.toArray()}
        target={target}
        angle={0.75}
        penumbra={0.9}
        intensity={1.5e5}
        decay={2}
        color={p['lamp-glow']}
        castShadow
        shadow-mapSize={high ? [2048, 2048] : [1024, 1024]}
        shadow-radius={high ? 7 : 1}
        shadow-bias={-0.0004}
        shadow-normalBias={0.4}
        shadow-camera-near={60}
        shadow-camera-far={520}
      />
      <Suspense fallback={null}>
        <Environment files={HDRI_URL} background backgroundBlurriness={0.55} backgroundIntensity={0.45} environmentIntensity={0.55} />
      </Suspense>
      {high && <ContactShadows position={[cx, 0.06, cz]} scale={[area.w + 60, area.d + 60]} opacity={0.55} blur={2.4} far={22} resolution={1024} color={p.ink} />}
    </>
  )
}
