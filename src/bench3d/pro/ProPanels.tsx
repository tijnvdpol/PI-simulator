import { WIRE_COLORS, type WireColor } from '../../bench/wires'
import type { Issue } from '../../circuit/analyze'
import { RESISTOR_VALUES, formatOhm } from '../../circuit/resistor'
import { PRO_NAMES_NL, type ProPart } from '../../circuit/types'
import { LED_COLORS, type LedColor } from '../../project/types'

const COLOR_NL: Record<WireColor, string> = { red: 'rood', black: 'zwart', blue: 'blauw', green: 'groen', yellow: 'geel', orange: 'oranje', purple: 'paars' }
const LED_NL: Record<LedColor, string> = { red: 'rood', green: 'groen', yellow: 'geel', blue: 'blauw', white: 'wit' }
const SWATCH: Record<WireColor, string> = {
  red: 'bg-wire-red', black: 'bg-wire-black', blue: 'bg-wire-blue', green: 'bg-wire-green', yellow: 'bg-wire-yellow', orange: 'bg-wire-orange', purple: 'bg-wire-purple',
}
const btn = 'rounded-ui border border-line bg-panel px-3 py-1.5 text-sm text-fg transition-colors duration-(--dur) hover:border-accent disabled:opacity-40 disabled:hover:border-line'

export function WireColorPicker({ value, onChange, label = 'Draadkleur' }: { value: WireColor | 'auto'; onChange: (c: WireColor | 'auto') => void; label?: string }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1.5">
      <button type="button" aria-pressed={value === 'auto'} onClick={() => onChange('auto')} className={`${btn} ${value === 'auto' ? 'border-accent' : ''}`}>Automatisch</button>
      {WIRE_COLORS.map((c) => (
        <button
          key={c} type="button" aria-label={COLOR_NL[c]} aria-pressed={value === c} title={COLOR_NL[c]} onClick={() => onChange(c)}
          className={`h-6 w-6 rounded-full border-2 ${SWATCH[c]} ${value === c ? 'border-accent' : 'border-line'}`}
        />
      ))}
    </div>
  )
}

export function ProToolbar(p: {
  wireColor: WireColor | 'auto'; onWireColor: (c: WireColor | 'auto') => void
  canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void
  pending: boolean; locked: boolean
}) {
  return (
    <div className="pointer-events-auto absolute left-3 top-3 flex max-w-[calc(100%-14rem)] flex-col gap-2 rounded-ui border border-line bg-panel/90 p-2 text-sm">
      <div className="flex items-center gap-2">
        <button type="button" className={btn} disabled={!p.canUndo || p.locked} onClick={p.onUndo} title="Ongedaan maken (Ctrl+Z)">↶ Ongedaan</button>
        <button type="button" className={btn} disabled={!p.canRedo || p.locked} onClick={p.onRedo} title="Opnieuw (Ctrl+Y)">↷ Opnieuw</button>
        <WireColorPicker value={p.wireColor} onChange={p.onWireColor} />
      </div>
      <p className="text-fg-muted" role="status">
        {p.locked
          ? 'Je programma draait: bouwen kan pas weer na Stop.'
          : p.pending ? 'Klik op een tweede pin of gaatje om de draad af te maken (Esc = annuleren).' : 'Klik op een pin of gaatje om een draad te beginnen. Sleep onderdelen vanuit de bak op het breadboard.'}
      </p>
    </div>
  )
}

export function ProIssues({ issues, onReplace }: { issues: Issue[]; onReplace?: (partId: string) => void }) {
  if (issues.length === 0) return null
  const tone = { fout: 'border-danger', waarschuwing: 'border-warning', info: 'border-line' } as const
  const icon = { fout: '⛔', waarschuwing: '⚠', info: 'ℹ' } as const
  return (
    <ul aria-label="Meldingen over je schakeling" className="pointer-events-auto absolute right-3 top-3 flex max-h-[55%] w-80 flex-col gap-2 overflow-y-auto">
      {issues.map((i) => (
        <li key={i.id} role={i.severity === 'fout' ? 'alert' : 'status'} className={`rounded-ui border ${tone[i.severity]} bg-panel/95 p-3 text-sm`}>
          <span aria-hidden className="mr-1">{icon[i.severity]}</span>{i.message}
          {i.partId && i.id.endsWith('-burnt') && onReplace && (
            <div className="mt-2"><button type="button" className={`${btn} border-danger`} onClick={() => onReplace(i.partId!)}>Vervang led</button></div>
          )}
        </li>
      ))}
    </ul>
  )
}

export function ProProperties(p: {
  part: ProPart; burnt: boolean; locked: boolean; hint?: string
  onResistance: (ohm: number) => void; onColor: (c: LedColor) => void; onRotate: () => void; onRemove: () => void; onReplace: () => void; onClose: () => void
}) {
  const { part } = p
  const label = `${PRO_NAMES_NL[part.kind][0].toUpperCase()}${PRO_NAMES_NL[part.kind].slice(1)}`
  return (
    <aside aria-label={`Eigenschappen van ${PRO_NAMES_NL[part.kind]}`} className="pointer-events-auto absolute bottom-3 left-3 flex w-72 flex-col gap-2 rounded-ui border border-line bg-panel/95 p-3 text-sm">
      <div className="flex items-center justify-between">
        <strong>{label}{part.kind === 'resistor' ? ` · ${formatOhm(part.resistance ?? 330)}` : ''}</strong>
        <button type="button" className="text-fg-muted hover:text-fg" onClick={p.onClose} aria-label="Sluiten">✕</button>
      </div>
      {p.hint && <p className="text-fg-muted">{p.hint}</p>}
      {part.kind === 'resistor' && (
        <label className="flex items-center justify-between gap-2">Waarde
          <select className="rounded-ui border border-line bg-bg px-2 py-1" value={part.resistance ?? 330} disabled={p.locked} onChange={(e) => p.onResistance(Number(e.target.value))}>
            {RESISTOR_VALUES.map((v) => <option key={v} value={v}>{formatOhm(v)}</option>)}
          </select>
        </label>
      )}
      {part.kind === 'led' && (
        <label className="flex items-center justify-between gap-2">Kleur
          <select className="rounded-ui border border-line bg-bg px-2 py-1" value={part.color ?? 'red'} disabled={p.locked} onChange={(e) => p.onColor(e.target.value as LedColor)}>
            {LED_COLORS.map((c) => <option key={c} value={c}>{LED_NL[c]}</option>)}
          </select>
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} disabled={p.locked} onClick={p.onRotate} title="Draaien (R)">⟳ Draaien</button>
        <button type="button" className={btn} disabled={p.locked} onClick={p.onRemove} title="Verwijderen (Delete)">Verwijderen</button>
        {p.burnt && <button type="button" className={`${btn} border-danger`} onClick={p.onReplace}>Vervang led</button>}
      </div>
    </aside>
  )
}

export function ProWireProperties(p: { color: WireColor; onColor: (c: WireColor) => void; onRemove: () => void; locked: boolean }) {
  return (
    <aside aria-label="Eigenschappen van draad" className="pointer-events-auto absolute bottom-3 left-3 flex w-80 flex-col gap-2 rounded-ui border border-line bg-panel/95 p-3 text-sm">
      <strong>Draad</strong>
      <WireColorPicker label="Kleur van deze draad" value={p.color} onChange={(c) => { if (c !== 'auto') p.onColor(c) }} />
      <div><button type="button" className={btn} disabled={p.locked} onClick={p.onRemove}>Draad verwijderen</button></div>
    </aside>
  )
}
