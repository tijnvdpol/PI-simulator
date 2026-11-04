import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { selectableTargets } from '../bench/benchState'
import { defaultDropPosition } from '../bench/partGeometry'
import { DRAG_TYPE } from '../ui/PartsTray'
import type { BenchProps } from '../bench/benchTypes'
import { benchWarnings } from '../bench/warnings'
import { isAnalog as analog } from '../bench/benchState'
import { pinByGpio, pinByPhysical } from '../pinout/pinout'
import { PART_KINDS, type Part, type PartKind } from '../project/types'
import { BenchOverlays } from './BenchOverlays'
import { CameraButtons } from './CameraButtons'
import { VIEWS, type ViewName } from './cameraViews'
import type { ViewRequest } from './CameraRig'
import { PartList } from './PartList'
import { PartOverlay } from './PartOverlay'
import { PinMenu } from './PinMenu'
import { placeOnTable, rayToTable } from './tablePlacement'
import type { ClientToTable } from './TableProbe'
import { worldToSvg } from './geometry'
import { partWorld } from './wireGeometry'
import { Scene } from './Scene'

/** Met `?debug` achter de url komt de renderer als `window.__pisimGl` beschikbaar (rooktest: aantal getekende frames). */
const DEBUG = import.meta.env.DEV || new URLSearchParams(location.search).has('debug')

/** 3D-werkbank. Zelfde props als de 2D-werkbank; het datamodel en de staat blijven ongewijzigd. */
export default function Bench3D({ parts, connecting, error, locked, dispatch, issues = [], live, children, onPartPress, sensors }: BenchProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState<ViewRequest | null>(null)
  const [hoverPin, setHoverPin] = useState<number | null>(null)
  const pressed = useRef<string | null>(null)
  const overlayItems = useRef(new Map<string, HTMLElement>())
  const projectRef = useRef<ClientToTable | null>(null)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ id: string; offX: number; offZ: number; sx: number; sy: number; moved: boolean } | null>(null)
  const lastDragEnd = useRef(0)
  const register = (id: string) => (el: HTMLElement | null) => { if (el) overlayItems.current.set(id, el); else overlayItems.current.delete(id) }

  const warnings = useMemo(() => benchWarnings(parts), [parts])
  const targets = connecting ? selectableTargets({ parts, connecting, error }, connecting) : null
  const connectingPart = parts.find((p) => p.id === connecting)
  const selectedPart = parts.find((p) => p.id === selected)
  const usedChannels = useMemo(() => parts.flatMap((p) => (p.connection?.type === 'adc' ? [p.connection.channel] : [])), [parts])

  // Pinnen waar de code iets mee wil, maar waar niets op zit.
  const issuePins = useMemo(() => issues.flatMap((i) => {
    if (i.pin.startsWith('CH')) return []
    const p = pinByGpio(Number(i.pin))
    return p ? [p.physical] : []
  }), [issues])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      if (e.key === 'Escape') {
        if (connecting) dispatch({ type: 'cancelConnect' })
        setSelected(null)
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !typing && !locked && selected) {
        dispatch({ type: 'remove', id: selected })
        setSelected(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [connecting, selected, locked, dispatch])

  const press = useCallback((part: Part, down: boolean) => {
    if (part.kind !== 'button' || !onPartPress) return
    if (down === (pressed.current === part.id)) return
    pressed.current = down ? part.id : null
    onPartPress(part, down)
  }, [onPartPress])

  const onSelect = useCallback((part: Part) => {
    setSelected(part.id)
    dispatch({ type: 'beginConnect', id: part.id })
  }, [dispatch])

  // Slepen eindigt waar de muis ook losgelaten wordt, ook buiten het canvas.
  useEffect(() => {
    if (!dragging) return
    const end = () => {
      if (drag.current?.moved) lastDragEnd.current = performance.now()
      drag.current = null
      setDragging(false)
    }
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => { window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end) }
  }, [dragging])

  const onPartDown = (part: Part, e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (locked) { press(part, true); return }
    const hit = rayToTable(e.ray)
    if (!hit) return
    const w = partWorld(part)
    drag.current = { id: part.id, offX: hit.x - w[0], offZ: hit.z - w[2], sx: e.nativeEvent.clientX, sy: e.nativeEvent.clientY, moved: false }
    setDragging(true)
  }

  const onTableMove = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current
    if (!d) return
    if (!d.moved && Math.hypot(e.nativeEvent.clientX - d.sx, e.nativeEvent.clientY - d.sy) < 4) return
    const hit = rayToTable(e.ray)
    if (!hit) return
    d.moved = true
    const svg = worldToSvg(hit.x - d.offX, hit.z - d.offZ)
    const spot = placeOnTable(svg.x, svg.y, parts.filter((p) => p.id !== d.id))
    const part = parts.find((p) => p.id === d.id)
    if (part && (part.x !== spot.x || part.y !== spot.y)) dispatch({ type: 'move', id: d.id, x: spot.x, y: spot.y })
  }

  // Neerzetten uit de onderdelenbak: de muispositie wordt een plek op de tafel en klikt vast op het raster naast de Pi.
  const onDrop = (e: React.DragEvent) => {
    if (locked) return
    const kind = e.dataTransfer.getData(DRAG_TYPE) as PartKind
    if (!PART_KINDS.includes(kind)) return
    e.preventDefault()
    const hit = projectRef.current?.(e.clientX, e.clientY)
    const svg = hit ? worldToSvg(hit.x, hit.z) : defaultDropPosition(parts)
    dispatch({ type: 'add', kind, ...placeOnTable(svg.x, svg.y, parts) })
  }

  const requestView = (v: ViewName) => setView({ view: v, nonce: (view?.nonce ?? 0) + 1 })

  return (
    <div
      data-testid="bench"
      className="relative h-full w-full overflow-hidden"
      onDragOver={(e) => { if (!locked && e.dataTransfer.types.includes(DRAG_TYPE)) e.preventDefault() }}
      onDrop={onDrop}
    >
      <Canvas
        frameloop="demand"
        shadows
        dpr={[1, 2]}
        camera={{ position: [...VIEWS.reset.position], fov: 40, near: 1, far: 600 }}
        onCreated={({ gl }) => { if (DEBUG) (window as unknown as { __pisimGl?: unknown }).__pisimGl = gl }}
      >
        <Scene
          parts={parts}
          live={(p) => live?.(p) ?? {}}
          selectedId={selected}
          locked={locked}
          selectablePins={targets && targets.pins.length > 0 ? targets.pins : undefined}
          issuePins={issuePins}
          onPinClick={(physical) => { if (connecting) dispatch({ type: 'connect', id: connecting, target: { type: 'pin', physical } }) }}
          overlayItems={overlayItems}
          projectRef={projectRef}
          controlsEnabled={!dragging}
          onTablePointerMove={onTableMove}
          hoverPin={hoverPin}
          onPinHover={setHoverPin}
          usedChannels={usedChannels}
          view={view}
          onPointerDown={onPartDown}
          onPointerUp={(part) => press(part, false)}
          onPointerOut={(part) => press(part, false)}
          onClick={(part, e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation()
            if (locked || performance.now() - lastDragEnd.current < 80) return
            onSelect(part)
          }}
          onTableClick={() => { if (connecting) dispatch({ type: 'cancelConnect' }); setSelected(null) }}
        />
      </Canvas>

      {/* labels, schuifjes en pin-tooltip: gewone HTML, door de scène op hun 3D-plek gezet */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {parts.map((part) => (
          <div key={part.id} data-overlay={part.id} ref={register(`part:${part.id}`)} className="absolute left-0 top-0" style={{ visibility: 'hidden' }}>
            <PartOverlay
              part={part}
              slider={sensors && analog(part.kind) ? { value: sensors.values[part.id], onChange: (v) => sensors.onChange(part, v) } : undefined}
            />
          </div>
        ))}
        {hoverPin !== null && (
          <div ref={register('pin-tip')} className="absolute left-0 top-0" style={{ visibility: 'hidden' }}>
            <div role="tooltip" className="whitespace-nowrap rounded-ui border border-line bg-ink px-2 py-1 text-xs text-fg" style={{ transform: 'translateY(-110%)' }}>
              <strong>Pin {pinByPhysical(hoverPin).physical} · {pinByPhysical(hoverPin).naam}</strong>
              <span className="text-fg-muted"> · {pinByPhysical(hoverPin).functie}</span>
            </div>
          </div>
        )}
      </div>

      <BenchOverlays
        locked={locked}
        connectingPart={connectingPart}
        hideConnectHint
        error={error}
        selectedPart={selectedPart}
        warnings={warnings}
        issues={issues}
        dispatch={dispatch}
        onDeselect={() => setSelected(null)}
      />
      {connectingPart && !locked && (
        <PinMenu
          part={connectingPart}
          targets={targets ?? { pins: [], channels: [] }}
          onPick={(target) => dispatch({ type: 'connect', id: connectingPart.id, target })}
          onClose={() => dispatch({ type: 'cancelConnect' })}
        />
      )}
      <PartList
        parts={parts}
        live={live}
        locked={locked}
        selectedId={selected}
        onSelect={onSelect}
        onRemove={(part) => { dispatch({ type: 'remove', id: part.id }); setSelected(null) }}
        onPress={press}
      />
      <CameraButtons onView={requestView} />
      {children}
    </div>
  )
}

