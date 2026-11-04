import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { selectableTargets } from '../bench/benchState'
import type { BenchProps } from '../bench/components/Bench'
import { benchWarnings } from '../bench/warnings'
import { isAnalog as analog } from '../bench/benchState'
import { pinByGpio, pinByPhysical } from '../pinout/pinout'
import type { Part } from '../project/types'
import { BenchOverlays } from './BenchOverlays'
import { CameraButtons } from './CameraButtons'
import { VIEWS, type ViewName } from './cameraViews'
import type { ViewRequest } from './CameraRig'
import { PartOverlay } from './PartOverlay'
import { Scene } from './Scene'

/** 3D-werkbank. Zelfde props als de 2D-werkbank; het datamodel en de staat blijven ongewijzigd. */
export default function Bench3D({ parts, connecting, error, locked, dispatch, issues = [], live, children, onPartPress, sensors }: BenchProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState<ViewRequest | null>(null)
  const [hoverPin, setHoverPin] = useState<number | null>(null)
  const pressed = useRef<string | null>(null)
  const overlayItems = useRef(new Map<string, HTMLElement>())
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

  const requestView = (v: ViewName) => setView({ view: v, nonce: (view?.nonce ?? 0) + 1 })

  return (
    <div data-testid="bench" className="relative h-full w-full overflow-hidden">
      <Canvas
        frameloop="demand"
        shadows
        dpr={[1, 2]}
        camera={{ position: [...VIEWS.reset.position], fov: 40, near: 1, far: 600 }}
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
          hoverPin={hoverPin}
          onPinHover={setHoverPin}
          usedChannels={usedChannels}
          view={view}
          onPointerDown={(part, e) => { if (locked) { e.stopPropagation(); press(part, true) } }}
          onPointerUp={(part) => press(part, false)}
          onPointerOut={(part) => press(part, false)}
          onClick={(part, e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (!locked) onSelect(part) }}
          onTableClick={() => { if (connecting) dispatch({ type: 'cancelConnect' }); setSelected(null) }}
        />
      </Canvas>

      {/* labels, schuifjes en pin-tooltip: gewone HTML, door de scène op hun 3D-plek gezet */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {parts.map((part) => (
          <div key={part.id} ref={register(`part:${part.id}`)} className="absolute left-0 top-0" style={{ visibility: 'hidden' }}>
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
        error={error}
        selectedPart={selectedPart}
        warnings={warnings}
        issues={issues}
        dispatch={dispatch}
        onDeselect={() => setSelected(null)}
      />
      <CameraButtons onView={requestView} />
      {children}
    </div>
  )
}

