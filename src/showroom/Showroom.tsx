import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import { resistorBands, RESISTOR_VALUES, formatOhm } from '../circuit/resistor'
import type { ProPart } from '../circuit/types'
import { Breadboard } from '../bench3d/pro/Breadboard'
import { BB_CENTER, MCP_CENTER } from '../bench3d/pro/layout'
import { McpModule } from '../bench3d/pro/McpModule'
import { ProPartView } from '../bench3d/pro/ProParts'
import { ProWires } from '../bench3d/pro/ProWires'
import { Effects } from '../bench3d/env/Effects'
import { setQuality, useQuality } from '../bench3d/env/quality'
import { Workshop } from '../bench3d/env/Workshop'
import { PI_BOARD, PI_ORIGIN } from '../bench3d/geometry'
import { Leg, ResistorBody } from '../bench3d/models/bodies'
import { PartModel } from '../bench3d/models/PartModel'
import { PiBoardModel } from '../bench3d/models/PiBoardModel'
import { Mcp3008Model } from '../bench3d/models/Mcp3008Model'
import { Table } from '../bench3d/Table'
import type { Part, PartKind } from '../project/types'
import { LED_COLORS } from '../project/types'

type ItemId = 'pi' | 'breadboard' | 'mcp' | 'chip' | 'led' | 'resistor' | 'button' | 'buzzer' | 'temperature' | 'potentiometer' | 'circuit'

interface Item { id: ItemId; label: string; hint: string; distance: number }

const ITEMS: Item[] = [
  { id: 'pi', label: 'Raspberry Pi 4/5', hint: '85 × 56 mm op vier voetjes, met header, poorten, SoC en RAM.', distance: 150 },
  { id: 'breadboard', label: 'Breadboard', hint: 'Half formaat: 30 kolommen, a–j, rails.', distance: 135 },
  { id: 'mcp', label: 'MCP3008-module', hint: 'De ADC-module met 8 kanalen.', distance: 85 },
  { id: 'chip', label: 'MCP3008-chip', hint: 'DIP-16.', distance: 40 },
  { id: 'led', label: 'Led (5 mm)', hint: 'Doorschijnend epoxy, platte kant = kathode, anode (lange poot) = plus.', distance: 44 },
  { id: 'resistor', label: 'Weerstand', hint: 'Kleurringen horen bij de waarde.', distance: 36 },
  { id: 'button', label: 'Drukknop', hint: '6 × 6 mm tactile switch.', distance: 30 },
  { id: 'buzzer', label: 'Buzzer', hint: 'Met "+"-markering en gaatje.', distance: 36 },
  { id: 'temperature', label: 'Temperatuursensor', hint: 'TO-92-huisje met drie pootjes.', distance: 28 },
  { id: 'potentiometer', label: 'Potmeter', hint: 'Draaiknop met geribbelde rand en standstreep.', distance: 38 },
  { id: 'circuit', label: 'Breadboard met schakeling', hint: 'Onderdelen op het breadboard, met jumperdraden en Dupont-stekkers.', distance: 130 },
]

const part = (kind: PartKind, extra: Partial<Part> = {}): Part => ({ id: 'showroom', kind, x: 0, y: 0, connection: null, ...extra })

const CIRCUIT: { parts: ProPart[]; wires: { id: string; a: string; b: string; color: 'red' | 'blue' | 'black' | 'green' | 'yellow' | 'orange' | 'purple' }[] } = {
  parts: [
    { id: 'r1', kind: 'resistor', col: 5, row: 1, rot: 0, resistance: 330 },
    { id: 'l1', kind: 'led', col: 10, row: 2, rot: 0, color: 'red' },
    { id: 'r2', kind: 'resistor', col: 5, row: 7, rot: 0, resistance: 1000 },
    { id: 'l2', kind: 'led', col: 10, row: 7, rot: 0, color: 'green' },
    { id: 'b1', kind: 'button', col: 16, row: 4, rot: 0 },
    { id: 'z1', kind: 'buzzer', col: 22, row: 1, rot: 0 },
    { id: 't1', kind: 'temperature', col: 22, row: 7, rot: 0 },
    { id: 'p1', kind: 'potentiometer', col: 27, row: 3, rot: 0 },
  ] as ProPart[],
  wires: [
    { id: 'w1', a: 'h:e4', b: 'h:e12', color: 'yellow' },
    { id: 'w2', a: 'h:a13', b: 'r:t-:5', color: 'black' },
    { id: 'w3', a: 'h:j9', b: 'h:g20', color: 'blue' },
  ],
}

/** Draaiplateau: draait het onderdeel langzaam rond, om zijn eigen midden. */
function Turntable({ speed, children }: { speed: number; children: React.ReactNode }) {
  const g = useRef<Group>(null)
  useFrame((_, dt) => { if (g.current && speed > 0) g.current.rotation.y += dt * speed })
  return <group ref={g}>{children}</group>
}

/** Het geselecteerde onderdeel, gecentreerd op de mat. */
function Subject({ id, on, pressed, ohm, color }: { id: ItemId; on: boolean; pressed: boolean; ohm: number; color: (typeof LED_COLORS)[number] }) {
  const live = { level: on ? 1 : 0, pressed, position: 0.7 }
  switch (id) {
    case 'pi': return <group position={[-(PI_ORIGIN.x + PI_BOARD.width / 2), 0, -(PI_ORIGIN.z + PI_BOARD.depth / 2)]}><PiBoardModel /></group>
    case 'breadboard': return <group position={[-BB_CENTER.x, 0, -BB_CENTER.z]}><Breadboard marks={new Map()} /></group>
    case 'mcp': return <group position={[-MCP_CENTER.x, 0, -MCP_CENTER.z]}><McpModule marks={new Map()} /></group>
    case 'chip': return <group position={[0, 0, 0]} scale={3}><Mcp3008Model /></group>
    case 'led': return <PartModel part={part('led', { color })} live={live} />
    case 'resistor': return <ResistorStandalone ohm={ohm} />
    case 'button': return <PartModel part={part('button')} live={live} />
    case 'buzzer': return <PartModel part={part('buzzer')} live={live} />
    case 'temperature': return <PartModel part={part('temperature')} live={live} />
    case 'potentiometer': return <PartModel part={part('potentiometer')} live={live} />
    case 'circuit':
      return (
        <group position={[-BB_CENTER.x, 0, -BB_CENTER.z]}>
          <Breadboard marks={new Map()} />
          {CIRCUIT.parts.map((p) => (
            <ProPartView key={p.id} part={p} live={{ level: on ? 1 : 0, pressed, position: 0.7 }} selected={false} handlers={{}} />
          ))}
          <ProWires wires={CIRCUIT.wires as never} selectedId={null} />
        </group>
      )
  }
}

/** Een weerstand los, met zijn bocht in de pootjes. */
function ResistorStandalone({ ohm }: { ohm: number }) {
  const bands = useMemo(() => resistorBands(ohm), [ohm])
  const half = 5.08
  return (
    <group name="resistor" position={[0, 4, 0]}>
      <ResistorBody bands={bands} />
      {[-1, 1].map((sg) => <Leg key={sg} points={[[sg * 2.95, 0, 0], [sg * (half - 0.9), 0, 0], [sg * half, -1, 0], [sg * half, -2.6, 0], [sg * half, -4, 0]]} />)}
    </group>
  )
}

/** Losse bekijk-pagina van elk onderdeel (/showroom): langzaam draaiend op de werkbank, zelfde omgeving en belichting. */
export function Showroom() {
  const [id, setId] = useState<ItemId>('pi')
  const [on, setOn] = useState(true)
  const [pressed, setPressed] = useState(false)
  const [ohm, setOhm] = useState(330)
  const [color, setColor] = useState<(typeof LED_COLORS)[number]>('red')
  const [turn, setTurn] = useState(true)
  const quality = useQuality()
  const item = ITEMS.find((i) => i.id === id)!
  const area = { w: 120, d: 100 }
  const cam: [number, number, number] = [item.distance * 0.55, item.distance * 0.55, item.distance * 0.7]

  return (
    <div className="flex h-full">
      <aside className="flex w-64 shrink-0 flex-col gap-3 overflow-y-auto border-r border-line bg-panel p-3">
        <div>
          <h1 className="text-lg font-semibold">Showroom</h1>
          <a className="text-sm text-accent underline" href={import.meta.env.BASE_URL}>← Terug naar de werkbank</a>
        </div>
        <nav aria-label="Onderdelen" className="flex flex-col gap-1">
          {ITEMS.map((i) => (
            <button
              key={i.id}
              type="button"
              aria-pressed={i.id === id}
              onClick={() => setId(i.id)}
              className={`rounded-ui border px-3 py-1.5 text-left text-sm transition-colors duration-(--dur) hover:border-accent ${i.id === id ? 'border-accent bg-line' : 'border-line'}`}
            >
              {i.label}
            </button>
          ))}
        </nav>
        <p className="text-sm text-fg-muted">{item.hint}</p>
        <div className="flex flex-col gap-2 text-sm">
          {(id === 'led' || id === 'buzzer' || id === 'circuit') && (
            <label className="flex items-center gap-2"><input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} /> Aan</label>
          )}
          {(id === 'button' || id === 'circuit') && (
            <label className="flex items-center gap-2"><input type="checkbox" checked={pressed} onChange={(e) => setPressed(e.target.checked)} /> Ingedrukt</label>
          )}
          {id === 'led' && (
            <label className="flex items-center gap-2">Kleur
              <select className="rounded-ui border border-line bg-bg px-2 py-1" value={color} onChange={(e) => setColor(e.target.value as typeof color)}>
                {LED_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          )}
          {id === 'resistor' && (
            <label className="flex items-center gap-2">Waarde
              <select className="rounded-ui border border-line bg-bg px-2 py-1" value={ohm} onChange={(e) => setOhm(Number(e.target.value))}>
                {RESISTOR_VALUES.map((v) => <option key={v} value={v}>{formatOhm(v)}</option>)}
              </select>
            </label>
          )}
          <label className="flex items-center gap-2"><input type="checkbox" checked={turn} onChange={(e) => setTurn(e.target.checked)} /> Langzaam draaien</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={quality === 'high'} onChange={(e) => setQuality(e.target.checked ? 'high' : 'low')} /> Kwaliteit hoog</label>
        </div>
      </aside>
      <main className="relative min-w-0 flex-1" data-testid="showroom-canvas">
        <Canvas key={id} shadows dpr={[1, 2]} camera={{ position: cam, fov: 38, near: 1, far: 900 }} onCreated={({ gl }) => { (window as unknown as { __pisimGl?: unknown }).__pisimGl = gl }}>
          <ambientLight intensity={0.12} />
          <directionalLight position={[35, 75, 45]} intensity={0.35} />
          <Workshop center={[0, 0]} area={area} />
          <Table width={area.w} depth={area.d} center={[0, 0]} />
          <Turntable speed={turn ? 0.35 : 0}>
            <Subject id={id} on={on} pressed={pressed} ohm={ohm} color={color} />
          </Turntable>
          <Effects focus={[0, 0, 0]} />
          <OrbitControls makeDefault enableDamping target={[0, id === 'pi' || id === 'breadboard' || id === 'circuit' ? 3 : 6, 0]} minDistance={12} maxDistance={400} maxPolarAngle={Math.PI / 2 - 0.05} />
        </Canvas>
      </main>
    </div>
  )
}

export default Showroom
