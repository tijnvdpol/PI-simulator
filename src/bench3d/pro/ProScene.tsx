import { useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, type RefObject } from 'react'
import type { Circuit, ProPart } from '../../circuit/types'
import { CameraRig, type ViewRequest } from '../CameraRig'
import { PiBoardModel } from '../models/PiBoardModel'
import { usePalette } from '../palette'
import { Table } from '../Table'
import { TableProbe, type ClientToTable } from '../TableProbe'
import { Breadboard, type HoleMark } from './Breadboard'
import { BurnEffect } from './BurnEffect'
import { projectToScreen } from '../overlayProjection'
import { BB_TOP, PRO_TABLE, terminalWorld } from './layout'
import { McpModule } from './McpModule'
import { ProPartView, type ProLive, type ProPartHandlers } from './ProParts'
import { ProWires } from './ProWires'
import { PRO_LIMITS, PRO_VIEWS } from './views'

/** Alleen met `?debug`: laat de rooktest weten waar een aansluitpunt op het scherm staat. */
function DebugProbe() {
  const camera = useThree((st) => st.camera)
  const size = useThree((st) => st.size)
  const el = useThree((st) => st.gl.domElement)
  useEffect(() => {
    const w = window as unknown as { __pisimPro?: unknown }
    w.__pisimPro = {
      screenOf: (id: string) => {
        const t = terminalWorld(id)
        if (!t) return null
        camera.updateMatrixWorld()
        const pt = projectToScreen([t.x, t.y, t.z], camera, size.width, size.height)
        const r = el.getBoundingClientRect()
        return pt ? { x: r.left + pt.x, y: r.top + pt.y } : null
      },
    }
    return () => { delete w.__pisimPro }
  }, [camera, size, el])
  return null
}

export interface BurnSpot { key: string; x: number; z: number }

export interface ProSceneProps extends ProPartHandlers {
  circuit: Circuit
  live: (part: ProPart) => ProLive
  selectedPartId: string | null
  selectedWireId: string | null
  pending: string | null
  marks: Map<string, HoleMark>
  preview: { a: string; b: string } | null
  burns: BurnSpot[]
  onBurnDone: (key: string) => void
  onTerminalHover: (id: string | null) => void
  onTerminalClick: (id: string) => void
  onWireSelect: (id: string) => void
  projectRef: RefObject<ClientToTable | null>
  view: ViewRequest | null
  controlsEnabled?: boolean
  debug?: boolean
  onTableClick?: (e: ThreeEvent<MouseEvent>) => void
}

/** Alles in het 3D-canvas van de pro-modus: licht, tafel, Pi, breadboard, MCP3008-module, onderdelen en draden. */
export function ProScene(p: ProSceneProps) {
  const pal = usePalette()
  const handlers = { onPointerDown: p.onPointerDown, onPointerUp: p.onPointerUp, onPointerOut: p.onPointerOut, onClick: p.onClick }
  const pinMarked = useMemo(() => {
    const m = /^pin:(\d+)$/.exec(p.pending ?? '')
    return m ? [Number(m[1])] : []
  }, [p.pending])
  return (
    <>
      <color attach="background" args={[pal.ink]} />
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[40, 110, 40]} intensity={1.7} castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-110} shadow-camera-right={110} shadow-camera-top={110} shadow-camera-bottom={-110}
        shadow-camera-near={10} shadow-camera-far={300} shadow-bias={-0.0006} shadow-radius={4}
      />
      <Table width={PRO_TABLE.width} depth={PRO_TABLE.depth} center={[PRO_TABLE.cx, PRO_TABLE.cz]} onClick={p.onTableClick} />
      <PiBoardModel
        clickAll marked={pinMarked}
        onPinClick={(n) => p.onTerminalClick(`pin:${n}`)}
        onHover={(n) => p.onTerminalHover(n === null ? null : `pin:${n}`)}
      />
      <Breadboard marks={p.marks} onHover={p.onTerminalHover} onClick={p.onTerminalClick} />
      <McpModule marks={p.marks} onHover={p.onTerminalHover} onClick={p.onTerminalClick} />
      {p.circuit.parts.map((part) => (
        <ProPartView key={part.id} part={part} live={p.live(part)} selected={part.id === p.selectedPartId} handlers={handlers} />
      ))}
      <ProWires wires={p.circuit.wires} selectedId={p.selectedWireId} onSelect={p.onWireSelect} preview={p.preview} />
      {p.burns.map((b) => <BurnEffect key={b.key} x={b.x} y={BB_TOP} z={b.z} onDone={() => p.onBurnDone(b.key)} />)}
      <TableProbe apiRef={p.projectRef} height={BB_TOP} />
      {p.debug && <DebugProbe />}
      <CameraRig request={p.view} enabled={p.controlsEnabled ?? true} views={PRO_VIEWS} limits={PRO_LIMITS} />
    </>
  )
}
