import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { type PinIssue } from '../../engine/explainError'
import { pinByGpio, pinByPhysical } from '../../pinout/pinout'
import { DRAG_TYPE } from '../../ui/PartsTray'
import { LED_COLORS, PART_KINDS, type LedColor, type Part, type PartKind } from '../../project/types'
import { PART_NAMES_NL, isAnalog, selectableTargets, type BenchAction } from '../benchState'
import { BOARD_POS, VIEW_H, VIEW_W } from '../partGeometry'
import { benchWarnings } from '../warnings'
import { computeWires } from '../wires'
import { ButtonArt } from './Button'
import { BuzzerArt } from './Buzzer'
import { LedArt } from './Led'
import { Mcp3008 } from './Mcp3008'
import { PiBoard } from './PiBoard'
import { PotentiometerArt } from './Potentiometer'
import { TemperatureArt } from './TemperatureSensor'
import { WireLayer } from './WireLayer'

export interface PartLive {
  level?: number        // led/buzzer-uitgang 0..1
  pressed?: boolean     // knop
  celsius?: number      // temperatuursensor
  position?: number     // potmeter 0..1
}

export interface BenchProps {
  parts: Part[]
  connecting: string | null
  error: string | null
  locked: boolean
  dispatch: (a: BenchAction) => void
  issues?: PinIssue[]
  /** Levende waarden per onderdeel (tijdens het draaien). */
  live?: (part: Part) => PartLive
  /** Extra inhoud over de werkbank (bijv. de lege-staat-uitnodiging). */
  children?: ReactNode
  /** Knop ingedrukt/losgelaten tijdens het draaien. */
  onPartPress?: (part: Part, pressed: boolean) => void
  /** Schuifjes voor sensoren: waarde per onderdeel (°C bij temperatuur, 0..1 bij potmeter). */
  sensors?: { values: Record<string, number>; onChange: (part: Part, value: number) => void }
}

const COLOR_LABELS: Record<LedColor, string> = { red: 'Rood', green: 'Groen', yellow: 'Geel', blue: 'Blauw', white: 'Wit' }

function toSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const ctm = svg.getScreenCTM?.()
  if (ctm && svg.createSVGPoint) {
    const p = svg.createSVGPoint()
    p.x = clientX; p.y = clientY
    const r = p.matrixTransform(ctm.inverse())
    return { x: r.x, y: r.y }
  }
  const r = svg.getBoundingClientRect()
  return { x: (clientX - r.left) * (VIEW_W / (r.width || VIEW_W)), y: (clientY - r.top) * (VIEW_H / (r.height || VIEW_H)) }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Bijv. " · GPIO 17": zo zie je welk nummer je in je code moet gebruiken. */
function placeLabel(part: Part): string {
  const c = part.connection
  if (!c) return ''
  if (c.type === 'adc') return ` · kanaal ${c.channel}`
  const g = pinByPhysical(c.physical).gpio
  return g === null ? '' : ` · GPIO ${g}`
}

function SensorSlider({ part, value, onChange }: { part: Part; value: number | undefined; onChange: (v: number) => void }) {
  const isTemp = part.kind === 'temperature'
  const v = value ?? (isTemp ? 20 : 0.5)
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()
  return (
    <foreignObject x="-52" y="72" width="104" height="44" onPointerDown={stop} onClick={stop}>
      <div className="flex flex-col items-center gap-0.5 text-[11px] text-fg">
        <input
          type="range"
          aria-label={isTemp ? 'Temperatuur' : 'Stand van de potmeter'}
          className="w-24 accent-accent"
          min={isTemp ? -10 : 0}
          max={isTemp ? 50 : 100}
          step={isTemp ? 0.5 : 1}
          value={isTemp ? v : Math.round(v * 100)}
          onChange={(e) => onChange(isTemp ? Number(e.target.value) : Number(e.target.value) / 100)}
        />
        <span>{isTemp ? `${v} °C` : `${Math.round(v * 100)}%`}</span>
      </div>
    </foreignObject>
  )
}

function PartArt({ part, live }: { part: Part; live: PartLive }) {
  switch (part.kind) {
    case 'led': return <LedArt color={part.color} level={live.level ?? 0} />
    case 'button': return <ButtonArt pressed={live.pressed} />
    case 'buzzer': return <BuzzerArt active={(live.level ?? 0) > 0} />
    case 'temperature': return <TemperatureArt celsius={live.celsius} />
    case 'potentiometer': return <PotentiometerArt value={live.position} />
  }
}

export function Bench({ parts, connecting, error, locked, dispatch, issues = [], live, children, onPartPress, sensors }: BenchProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const drag = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const pressed = useRef<string | null>(null)

  const wires = useMemo(() => computeWires(parts), [parts])
  const warnings = useMemo(() => benchWarnings(parts), [parts])
  const hasAnalog = parts.some((p) => isAnalog(p.kind))
  const targets = connecting ? selectableTargets({ parts, connecting, error }, connecting) : null
  const connectingPart = parts.find((p) => p.id === connecting)
  const selectedPart = parts.find((p) => p.id === selected)

  // Pinnen waar de code iets mee wil, maar waar niets op zit (pulserend rood).
  const issuePins = issues.flatMap((i) => {
    if (i.pin.startsWith('CH')) return []
    const p = pinByGpio(Number(i.pin))
    return p ? [p.physical] : []
  })

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

  const onDrop = (e: React.DragEvent) => {
    if (locked) return
    const kind = e.dataTransfer.getData(DRAG_TYPE) as PartKind
    if (!PART_KINDS.includes(kind) || !svgRef.current) return
    e.preventDefault()
    const p = toSvgPoint(svgRef.current, e.clientX, e.clientY)
    dispatch({ type: 'add', kind, x: clamp(p.x, 40, VIEW_W - 40), y: clamp(p.y, 40, VIEW_H - 60) })
  }

  const onPartClick = (part: Part) => {
    if (suppressClick.current) { suppressClick.current = false; return }
    if (locked) return
    setSelected(part.id)
    dispatch({ type: 'beginConnect', id: part.id })
  }

  const press = (part: Part, down: boolean) => {
    if (part.kind !== 'button' || !onPartPress) return
    if (down === (pressed.current === part.id)) return
    pressed.current = down ? part.id : null
    onPartPress(part, down)
  }

  const onPointerDown = (e: React.PointerEvent, part: Part) => {
    if (locked) { press(part, true); return }
    drag.current = { id: part.id, sx: e.clientX, sy: e.clientY, ox: part.x, oy: part.y, moved: false }
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    const svg = svgRef.current
    if (!d || !svg) return
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy
    if (!d.moved && Math.hypot(dx, dy) < 4) return
    d.moved = true
    const r = svg.getBoundingClientRect()
    const scale = Math.max(VIEW_W / (r.width || VIEW_W), VIEW_H / (r.height || VIEW_H))
    dispatch({ type: 'move', id: d.id, x: clamp(d.ox + dx * scale, 30, VIEW_W - 30), y: clamp(d.oy + dy * scale, 40, VIEW_H - 50) })
  }
  const onPointerUp = (part: Part) => {
    press(part, false)
    if (drag.current?.moved) suppressClick.current = true
    drag.current = null
  }

  return (
    <div
      data-testid="bench"
      className="relative h-full w-full overflow-hidden"
      onDragOver={(e) => { if (!locked && e.dataTransfer.types.includes(DRAG_TYPE)) e.preventDefault() }}
      onDrop={onDrop}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-full w-full select-none"
        onClick={(e) => {
          if (!(e.target as Element).hasAttribute('data-bg')) return
          if (connecting) dispatch({ type: 'cancelConnect' })
          setSelected(null)
        }}
      >
        <rect data-bg x="0" y="0" width={VIEW_W} height={VIEW_H} fill="transparent" />
        <g transform={`translate(${BOARD_POS.x} ${BOARD_POS.y})`}>
          <PiBoard
            selectable={targets && targets.pins.length > 0 ? targets.pins : undefined}
            onPinClick={(physical) => { if (connecting) dispatch({ type: 'connect', id: connecting, target: { type: 'pin', physical } }) }}
            issuePins={issuePins}
          />
        </g>
        {hasAnalog && (
          <Mcp3008
            selectable={targets && targets.channels.length > 0 ? targets.channels : undefined}
            onChannelClick={(channel) => { if (connecting) dispatch({ type: 'connect', id: connecting, target: { type: 'adc', channel } }) }}
            usedChannels={parts.flatMap((p) => (p.connection?.type === 'adc' ? [p.connection.channel] : []))}
          />
        )}
        <WireLayer wires={wires} parts={parts} />
        {parts.map((part) => {
          const isSel = part.id === selected || part.id === connecting
          return (
            <g
              key={part.id}
              data-part-id={part.id}
              data-kind={part.kind}
              data-color={part.color}
              transform={`translate(${part.x} ${part.y})`}
              style={{ cursor: locked ? 'default' : 'pointer' }}
              onClick={(e) => { e.stopPropagation(); onPartClick(part) }}
              onPointerDown={(e) => onPointerDown(e, part)}
              onPointerMove={onPointerMove}
              onPointerUp={() => onPointerUp(part)}
              onPointerCancel={() => onPointerUp(part)}
              onPointerLeave={() => press(part, false)}
              tabIndex={locked && part.kind === 'button' ? 0 : undefined}
              onKeyDown={(e) => { if (locked && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); press(part, true) } }}
              onKeyUp={(e) => { if (locked && (e.key === ' ' || e.key === 'Enter')) press(part, false) }}
            >
              {isSel && <rect x="-40" y="-40" width="80" height="96" rx="8" fill="none" className="stroke-accent" strokeWidth="2" strokeDasharray="5 4" />}
              <rect x="-36" y="-36" width="72" height="88" fill="transparent" />
              <PartArt part={part} live={live?.(part) ?? {}} />
              <text y="66" textAnchor="middle" fontSize="11" className="fill-fg-muted">{PART_NAMES_NL[part.kind]}{placeLabel(part)}</text>
              {sensors && isAnalog(part.kind) && (
                <SensorSlider part={part} value={sensors.values[part.id]} onChange={(v) => sensors.onChange(part, v)} />
              )}
            </g>
          )
        })}
      </svg>

      {/* hints en knoppenbalk */}
      <div className="pointer-events-none absolute inset-x-0 top-3 flex flex-col items-center gap-2">
        {locked && (
          <div className="pointer-events-auto rounded-ui border border-line bg-panel px-3 py-1.5 text-sm text-fg-muted">Stop eerst om te bewerken</div>
        )}
        {connectingPart && !locked && (
          <div className="pointer-events-auto rounded-ui border border-accent bg-panel px-3 py-1.5 text-sm text-fg">
            Kies een {isAnalog(connectingPart.kind) ? 'kanaal van de chip' : `pin voor de ${PART_NAMES_NL[connectingPart.kind]}`} <span className="text-fg-muted">· Esc om te annuleren</span>
          </div>
        )}
        {error && !locked && (
          <div role="alert" className="pointer-events-auto rounded-ui border border-danger bg-panel px-3 py-1.5 text-sm text-fg">{error}</div>
        )}
        {selectedPart && !locked && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-ui border border-line bg-panel px-3 py-1.5 text-sm">
            <span className="text-fg-muted">{PART_NAMES_NL[selectedPart.kind]}</span>
            {selectedPart.kind === 'led' && LED_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={COLOR_LABELS[c]}
                aria-pressed={selectedPart.color === c}
                onClick={() => dispatch({ type: 'setColor', id: selectedPart.id, color: c })}
                className={`h-5 w-5 rounded-full border-2 ${selectedPart.color === c ? 'border-fg' : 'border-line'} ${{ red: 'bg-led-red', green: 'bg-led-green', yellow: 'bg-led-yellow', blue: 'bg-led-blue', white: 'bg-led-white' }[c]}`}
              />
            ))}
            <button
              type="button"
              onClick={() => { dispatch({ type: 'remove', id: selectedPart.id }); setSelected(null) }}
              className="rounded-ui px-2 py-1 text-danger transition-colors duration-(--dur) hover:bg-line"
            >
              Verwijder
            </button>
          </div>
        )}
      </div>

      {/* waarschuwingen en meldingen van de code */}
      <div className="absolute bottom-3 left-3 flex max-w-md flex-col gap-2">
        {warnings.map((w) => (
          <div key={w.partId} role="status" className="flex gap-2 rounded-ui border border-warning bg-panel p-3 text-sm">
            <span aria-hidden className="text-warning">⚠</span>
            <span>{w.message}</span>
          </div>
        ))}
        {issues.map((i) => (
          <div key={i.id} role="alert" className="flex gap-2 rounded-ui border border-danger bg-panel p-3 text-sm">
            <span aria-hidden className="text-danger">⛔</span>
            <span>{i.message}</span>
          </div>
        ))}
      </div>
      {children}
    </div>
  )
}

