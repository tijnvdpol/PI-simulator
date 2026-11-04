import { useMemo, type RefObject } from 'react'
import { isAnalog } from '../bench/benchState'
import type { PartLive } from '../bench/components/Bench'
import { computeWires } from '../bench/wires'
import type { Part } from '../project/types'
import { CHIP_CENTER, type V3 } from './anchors'
import { pinWorld } from './geometry'
import { partWorld } from './wireGeometry'
import { OverlayProjector } from './OverlayProjector'
import { TableProbe, type ClientToTable } from './TableProbe'
import { CameraRig, type ViewRequest } from './CameraRig'
import { Mcp3008Model } from './models/Mcp3008Model'
import { PiBoardModel } from './models/PiBoardModel'
import { ScenePart, type PartHandlers } from './ScenePart'
import { Table } from './Table'
import { WireLayer3D } from './WireLayer3D'
import { usePalette } from './palette'
import type { ThreeEvent } from '@react-three/fiber'

export interface SceneProps extends PartHandlers {
  parts: Part[]
  live: (part: Part) => PartLive
  selectedId: string | null
  locked: boolean
  /** Pinnen die nu gekozen mogen worden (bij het aansluiten), anders undefined. */
  selectablePins?: number[]
  issuePins?: number[]
  onPinClick?: (physical: number) => void
  /** HTML-elementen (labels, tooltip) die op een 3D-plek moeten staan, per id. */
  overlayItems: RefObject<Map<string, HTMLElement>>
  /** Wordt gevuld met een functie die muispositie omzet naar een plek op de tafel (voor neerzetten uit de bak). */
  projectRef: RefObject<ClientToTable | null>
  /** Pin onder de muis, voor de tooltip. */
  hoverPin: number | null
  onPinHover?: (physical: number | null) => void
  usedChannels: number[]
  view: ViewRequest | null
  controlsEnabled?: boolean
  onTablePointerMove?: (e: ThreeEvent<PointerEvent>) => void
  onTableClick?: (e: ThreeEvent<MouseEvent>) => void
}

/** Alles wat in het 3D-canvas staat: licht, tafel, Pi, chip, onderdelen en draden. */
export function Scene(props: SceneProps) {
  const { parts, live, selectedId, locked, selectablePins, issuePins, onPinClick, usedChannels } = props
  const p = usePalette()
  const wires = useMemo(() => computeWires(parts), [parts])
  const hasAnalog = parts.some((x) => isAnalog(x.kind))
  const { onPointerDown, onPointerUp, onPointerOut, onClick } = props
  const handlers = { onPointerDown, onPointerUp, onPointerOut, onClick }

  // Waar de HTML-labels staan: onder elk onderdeel, en boven de pin onder de muis.
  const anchors = useMemo(() => {
    const out: Record<string, V3> = {}
    for (const part of parts) {
      const w = partWorld(part)
      out[`part:${part.id}`] = [w[0], 0.5, w[2] + 13]
    }
    if (props.hoverPin !== null) {
      const t = pinWorld(props.hoverPin)
      out['pin-tip'] = [t.x, t.y + 1, t.z]
    }
    return out
  }, [parts, props.hoverPin])

  return (
    <>
      <color attach="background" args={[p.ink]} />
      {/* zachte belichting: één hoofdlicht (met schaduw) en omgevingslicht */}
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[35, 75, 45]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-camera-near={10}
        shadow-camera-far={200}
        shadow-bias={-0.0006}
        shadow-radius={4}
      />
      <Table onPointerMove={props.onTablePointerMove} onClick={props.onTableClick} />
      <PiBoardModel selectable={selectablePins} issuePins={issuePins} onPinClick={onPinClick} onHover={props.onPinHover} />
      {hasAnalog && (
        <group position={[CHIP_CENTER.x, 0, CHIP_CENTER.z]}>
          <Mcp3008Model usedChannels={usedChannels} />
        </group>
      )}
      <WireLayer3D wires={wires} parts={parts} />
      {parts.map((part) => (
        <ScenePart
          key={part.id}
          part={part}
          live={live(part)}
          selected={part.id === selectedId}
          locked={locked}
          {...handlers}
        />
      ))}
      <TableProbe apiRef={props.projectRef} />
      <OverlayProjector items={props.overlayItems} anchors={anchors} />
      <CameraRig request={props.view} enabled={props.controlsEnabled ?? true} />
    </>
  )
}
