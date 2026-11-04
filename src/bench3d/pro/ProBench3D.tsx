import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { WireColor } from '../../bench/wires'
import type { AnalysisResult } from '../../circuit/analyze'
import { describeTerminal, explainTerminal } from '../../circuit/labels'
import { canPlace, legPlaces } from '../../circuit/parts'
import { PRO_NAMES_NL, type Circuit, type ProKind, type ProPart, type Rot } from '../../circuit/types'
import type { ProAction } from '../../circuit/proState'
import { getDraggedKind, PRO_DRAG_TYPE } from '../../ui/proDrag'
import { CameraButtons } from '../CameraButtons'
import type { ViewRequest } from '../CameraRig'
import type { ViewName } from '../cameraViews'
import type { ClientToTable } from '../TableProbe'
import { rayToTable } from '../tablePlacement'
import { holeMarks } from './Breadboard'
import { BB_TOP, anchorForPoint, partCenter } from './layout'
import { ProIssues, ProProperties, ProToolbar, ProWireProperties } from './ProPanels'
import type { ProLive } from './ProParts'
import { ProScene, type BurnSpot } from './ProScene'
import { PRO_VIEWS } from './views'

const DEBUG = import.meta.env.DEV || new URLSearchParams(location.search).has('debug')

export interface ProBenchProps {
  circuit: Circuit
  pending: string | null
  error: string | null
  wireColor: WireColor | 'auto'
  canUndo: boolean
  canRedo: boolean
  burnt: string[]
  dispatch: (a: ProAction) => void
  /** Het programma draait: bouwen kan niet, knoppen en schuifjes wel. */
  locked: boolean
  result: AnalysisResult
  sensors: { values: Record<string, number>; onChange: (partId: string, v: number) => void }
  pressed: Record<string, boolean>
  onPress: (partId: string, pressed: boolean) => void
  children?: ReactNode
}

interface Ghost { kind: ProKind; col: number; row: number; rot: Rot; ok: boolean; holes: string[] }

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}

/** De 3D-werkbank van de pro-modus: Pi, breadboard, draden en onderdelen met pootjes. */
export default function ProBench3D(props: ProBenchProps) {
  const { circuit, locked, dispatch, result } = props
  const [selPart, setSelPart] = useState<string | null>(null)
  const [selWire, setSelWire] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null)
  const [ghost, setGhost] = useState<Ghost | null>(null)
  const [view, setView] = useState<ViewRequest | null>(null)
  const [dragging, setDragging] = useState(false)
  const [burns, setBurns] = useState<BurnSpot[]>([])
  const projectRef = useRef<ClientToTable | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const mouse = useRef({ x: 0, y: 0 })
  const rotRef = useRef<Rot>(0)
  const drag = useRef<{ id: string; offX: number; offZ: number; sx: number; sy: number; moved: boolean; rot: Rot } | null>(null)
  const lastDragEnd = useRef(0)
  const knownBurnt = useRef<Set<string>>(new Set(props.burnt))

  const partById = useMemo(() => new Map(circuit.parts.map((p) => [p.id, p])), [circuit.parts])
  const used = useMemo(() => new Set(circuit.parts.flatMap((p) => legPlaces(p).map((l) => l.hole))), [circuit.parts])
  const marks = useMemo(() => holeMarks({ hover, pending: props.pending, ghost, used }), [hover, props.pending, ghost, used])
  const preview = props.pending && hover && hover !== props.pending ? { a: props.pending, b: hover } : null
  const selectedPart = selPart ? partById.get(selPart) ?? null : null
  const selectedWire = selWire ? circuit.wires.find((w) => w.id === selWire) ?? null : null

  // Een verdwenen onderdeel of draad kan niet meer geselecteerd zijn.
  useEffect(() => { if (selPart && !partById.has(selPart)) setSelPart(null) }, [selPart, partById])
  useEffect(() => { if (selWire && !circuit.wires.some((w) => w.id === selWire)) setSelWire(null) }, [selWire, circuit.wires])

  // Rook en flits voor leds die net doorgebrand zijn.
  useEffect(() => {
    const fresh = props.burnt.filter((id) => !knownBurnt.current.has(id))
    knownBurnt.current = new Set(props.burnt)
    if (fresh.length === 0) return
    setBurns((prev) => [...prev, ...fresh.flatMap((id) => {
      const part = partById.get(id)
      if (!part) return []
      const c = partCenter(part)
      return [{ key: `${id}-${performance.now()}`, x: c.x, z: c.z }]
    })])
  }, [props.burnt, partById])

  const ghostFor = useCallback((kind: ProKind, rot: Rot, x: number, z: number, ignoreId?: string): Ghost | null => {
    const a = anchorForPoint(kind, rot, x, z)
    if (!a) return null
    const cand = { id: ignoreId ?? '__ghost', kind, col: a.col, row: a.row, rot }
    return { kind, rot, ...a, ok: canPlace(cand, circuit.parts), holes: legPlaces(cand).map((l) => l.hole) }
  }, [circuit.parts])

  const rotateGhost = () => {
    rotRef.current = ((rotRef.current + 1) % 4) as Rot
    const d = drag.current
    if (d) d.rot = rotRef.current
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      const mod = e.ctrlKey || e.metaKey
      if (e.key === 'Escape') { dispatch({ type: 'cancelWire' }); setSelPart(null); setSelWire(null); return }
      if (mod && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); if (!locked) dispatch({ type: e.shiftKey ? 'redo' : 'undo' }); return }
      if (mod && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); if (!locked) dispatch({ type: 'redo' }); return }
      if (mod || locked) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selPart) { dispatch({ type: 'remove', id: selPart }); setSelPart(null) }
        else if (selWire) { dispatch({ type: 'removeWire', id: selWire }); setSelWire(null) }
      } else if (e.key === 'r' || e.key === 'R') {
        if (drag.current || getDraggedKind()) rotateGhost()
        else if (selPart) dispatch({ type: 'rotate', id: selPart })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch, locked, selPart, selWire]) // eslint-disable-line react-hooks/exhaustive-deps

  // Slepen van een onderdeel dat al op het breadboard staat.
  useEffect(() => {
    if (!dragging) return
    const move = (e: PointerEvent) => {
      const d = drag.current
      if (!d) return
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 4) return
      const hit = projectRef.current?.(e.clientX, e.clientY)
      const part = partById.get(d.id)
      if (!hit || !part) return
      d.moved = true
      setGhost(ghostFor(part.kind, d.rot, hit.x - d.offX, hit.z - d.offZ, d.id))
    }
    const end = () => {
      const d = drag.current
      if (d?.moved) {
        lastDragEnd.current = performance.now()
        setGhost((g) => {
          if (g?.ok) dispatch({ type: 'move', id: d.id, col: g.col, row: g.row, rot: g.rot })
          return null
        })
      }
      drag.current = null
      setDragging(false)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end) }
  }, [dragging, partById, ghostFor, dispatch])

  const onPartDown = (part: ProPart, e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (locked) { if (part.kind === 'button') props.onPress(part.id, true); return }
    const hit = rayToTable(e.ray, BB_TOP)
    if (!hit) return
    const c = partCenter(part)
    rotRef.current = part.rot
    drag.current = { id: part.id, offX: hit.x - c.x, offZ: hit.z - c.z, sx: e.nativeEvent.clientX, sy: e.nativeEvent.clientY, moved: false, rot: part.rot }
    setDragging(true)
  }
  const onPartUp = (part: ProPart) => { if (part.kind === 'button') props.onPress(part.id, false) }

  const onTerminal = (id: string) => {
    if (locked) return
    setSelPart(null); setSelWire(null)
    dispatch({ type: 'clickTerminal', terminal: id })
  }

  const onDragOver = (e: React.DragEvent) => {
    const kind = getDraggedKind()
    if (locked || !kind || !e.dataTransfer.types.includes(PRO_DRAG_TYPE)) return
    e.preventDefault()
    const hit = projectRef.current?.(e.clientX, e.clientY)
    setGhost(hit ? ghostFor(kind, rotRef.current, hit.x, hit.z) : null)
  }
  const onDrop = (e: React.DragEvent) => {
    const kind = getDraggedKind()
    setGhost(null)
    if (locked || !kind) return
    e.preventDefault()
    const hit = projectRef.current?.(e.clientX, e.clientY)
    const g = hit ? ghostFor(kind, rotRef.current, hit.x, hit.z) : null
    if (g) dispatch({ type: 'add', kind, col: g.col, row: g.row, rot: g.rot })
  }

  const live = (part: ProPart): ProLive => ({
    ...result.parts[part.id],
    pressed: !!props.pressed[part.id],
    position: part.kind === 'potentiometer' ? props.sensors.values[part.id] ?? 0.5 : undefined,
    burnt: props.burnt.includes(part.id),
  })
  const requestView = (v: ViewName) => setView({ view: v, nonce: (view?.nonce ?? 0) + 1 })

  const analogParts = circuit.parts.filter((p) => p.kind === 'temperature' || p.kind === 'potentiometer')
  const buttons = circuit.parts.filter((p) => p.kind === 'button')

  return (
    <div
      ref={box}
      data-testid="bench"
      className="relative h-full w-full overflow-hidden"
      onDragOver={onDragOver}
      onDragLeave={() => setGhost(null)}
      onDrop={onDrop}
      onPointerMove={(e) => { const r = box.current?.getBoundingClientRect(); if (r) mouse.current = { x: e.clientX - r.left, y: e.clientY - r.top } }}
    >
      <Canvas
        frameloop="demand" shadows dpr={[1, 2]}
        camera={{ position: [...PRO_VIEWS.reset.position], fov: 40, near: 1, far: 900 }}
        onCreated={({ gl }) => { if (DEBUG) (window as unknown as { __pisimGl?: unknown }).__pisimGl = gl }}
      >
        <ProScene
          circuit={circuit} live={live}
          selectedPartId={selPart} selectedWireId={selWire} pending={props.pending}
          marks={marks} preview={preview} burns={burns}
          onBurnDone={(key) => setBurns((b) => b.filter((x) => x.key !== key))}
          onTerminalHover={(id) => { setHover(id); setTip(id ? { ...mouse.current } : null) }}
          onTerminalClick={onTerminal}
          onWireSelect={(id) => { if (performance.now() - lastDragEnd.current < 80) return; setSelWire(id); setSelPart(null) }}
          projectRef={projectRef} view={view} controlsEnabled={!dragging} debug={DEBUG}
          onPointerDown={onPartDown} onPointerUp={onPartUp} onPointerOut={onPartUp}
          onClick={(part, e) => { e.stopPropagation(); if (locked || performance.now() - lastDragEnd.current < 80) return; setSelPart(part.id); setSelWire(null) }}
          onTableClick={() => { dispatch({ type: 'cancelWire' }); setSelPart(null); setSelWire(null) }}
        />
      </Canvas>

      {hover && tip && (
        <div role="tooltip" className="pointer-events-none absolute z-10 whitespace-nowrap rounded-ui border border-line bg-ink px-2 py-1 text-xs text-fg" style={{ left: tip.x + 14, top: tip.y + 14 }}>
          <strong>{describeTerminal(hover)}</strong>
          {explainTerminal(hover) && <span className="text-fg-muted"> · {explainTerminal(hover)}</span>}
        </div>
      )}

      <ProToolbar
        wireColor={props.wireColor} onWireColor={(c) => dispatch({ type: 'setWireColor', color: c })}
        canUndo={props.canUndo} canRedo={props.canRedo} onUndo={() => dispatch({ type: 'undo' })} onRedo={() => dispatch({ type: 'redo' })}
        pending={props.pending !== null} locked={locked}
      />
      <ProIssues
        issues={[...(props.error ? [{ id: 'error', severity: 'waarschuwing' as const, message: props.error }] : []), ...result.issues]}
        onReplace={(id) => dispatch({ type: 'replace', id })}
      />

      {selectedPart && (
        <ProProperties
          part={selectedPart} burnt={props.burnt.includes(selectedPart.id)} locked={locked} hint={result.parts[selectedPart.id]?.hint}
          onResistance={(ohm) => dispatch({ type: 'setResistance', id: selectedPart.id, ohm })}
          onColor={(color) => dispatch({ type: 'setColor', id: selectedPart.id, color })}
          onRotate={() => dispatch({ type: 'rotate', id: selectedPart.id })}
          onRemove={() => { dispatch({ type: 'remove', id: selectedPart.id }); setSelPart(null) }}
          onReplace={() => dispatch({ type: 'replace', id: selectedPart.id })}
          onClose={() => setSelPart(null)}
        />
      )}
      {!selectedPart && selectedWire && (
        <ProWireProperties
          color={selectedWire.color} locked={locked}
          onColor={(color) => dispatch({ type: 'recolorWire', id: selectedWire.id, color })}
          onRemove={() => { dispatch({ type: 'removeWire', id: selectedWire.id }); setSelWire(null) }}
        />
      )}

      {(analogParts.length > 0 || buttons.length > 0 || circuit.parts.length > 0) && (
        <section aria-label="Bediening" className="pointer-events-auto absolute bottom-14 right-3 flex max-h-[45%] w-64 flex-col gap-2 overflow-y-auto rounded-ui border border-line bg-panel/95 p-3 text-sm">
          <h3 className="font-semibold text-fg-muted">Onderdelen</h3>
          <ul aria-label="Onderdelen op het breadboard" className="flex flex-col gap-1.5">
            {circuit.parts.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <button
                  type="button" className="rounded-ui px-2 py-1 text-left hover:bg-line focus-visible:outline-2 focus-visible:outline-accent"
                  data-kind={p.kind} data-part-id={p.id} data-status={result.parts[p.id]?.status ?? 'ok'} data-burnt={props.burnt.includes(p.id)}
                  aria-pressed={selPart === p.id}
                  onClick={() => { if (!locked) { setSelPart(p.id); setSelWire(null) } }}
                >
                  {PRO_NAMES_NL[p.kind]} <span className="text-fg-muted">{p.id}</span>
                  {props.burnt.includes(p.id) && <span className="text-danger"> · kapot</span>}
                </button>
                {p.kind === 'button' && (
                  <button
                    type="button" className="rounded-ui border border-line px-2 py-1 hover:border-accent" aria-label={`Druk op knop ${p.id}`}
                    onPointerDown={() => props.onPress(p.id, true)} onPointerUp={() => props.onPress(p.id, false)} onPointerLeave={() => props.onPress(p.id, false)}
                    onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); props.onPress(p.id, true) } }}
                    onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') props.onPress(p.id, false) }}
                  >Druk</button>
                )}
                {(p.kind === 'temperature' || p.kind === 'potentiometer') && (
                  <SensorSlider part={p} value={props.sensors.values[p.id]} onChange={(v) => props.sensors.onChange(p.id, v)} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <CameraButtons onView={requestView} />
      {props.children}
    </div>
  )
}

function SensorSlider({ part, value, onChange }: { part: ProPart; value: number | undefined; onChange: (v: number) => void }) {
  const isTemp = part.kind === 'temperature'
  const v = value ?? (isTemp ? 20 : 0.5)
  return (
    <span className="flex items-center gap-1 text-[11px]">
      <input
        type="range" aria-label={isTemp ? `Temperatuur van ${part.id}` : `Stand van potmeter ${part.id}`} className="w-20 accent-accent"
        min={isTemp ? -10 : 0} max={isTemp ? 50 : 100} step={isTemp ? 0.5 : 1} value={isTemp ? v : Math.round(v * 100)}
        onChange={(e) => onChange(isTemp ? Number(e.target.value) : Number(e.target.value) / 100)}
      />
      {isTemp ? `${v} °C` : `${Math.round(v * 100)}%`}
    </span>
  )
}
