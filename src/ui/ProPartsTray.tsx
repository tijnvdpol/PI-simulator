import { PRO_NAMES_NL, PRO_KINDS, type ProKind } from '../circuit/types'
import { PartIcon } from './PartIcon'
import { PRO_DRAG_TYPE, setDraggedKind } from './proDrag'

const LABELS: Record<ProKind, string> = {
  led: 'Led', resistor: 'Weerstand', button: 'Knop', buzzer: 'Buzzer', temperature: 'Temperatuursensor', potentiometer: 'Potmeter',
}
const HINTS: Record<ProKind, string> = {
  led: 'Lange poot is plus (+). Heeft een weerstand nodig',
  resistor: 'Beperkt de stroom; kies de waarde',
  button: 'Zet over de middenspleet',
  buzzer: 'Maakt een piepgeluid',
  temperature: 'Meet hoe warm het is (via MCP3008)',
  potentiometer: 'Een draaiknop met een stand (via MCP3008)',
}

function Icon({ kind }: { kind: ProKind }) {
  if (kind !== 'resistor') return <PartIcon kind={kind} />
  return (
    <svg width={40} height={40} viewBox="0 0 40 40" aria-hidden className="shrink-0">
      <rect x="3" y="19" width="34" height="2" className="fill-metal" />
      <rect x="9" y="14" width="22" height="12" rx="5" className="fill-resistor" />
      <rect x="13" y="14" width="2.5" height="12" className="fill-band-red" />
      <rect x="18" y="14" width="2.5" height="12" className="fill-band-red" />
      <rect x="23" y="14" width="2.5" height="12" className="fill-band-brown" />
      <rect x="28" y="14" width="2" height="12" className="fill-band-gold" />
    </svg>
  )
}

export function ProPartsTray({ onAdd }: { onAdd?: (kind: ProKind) => void }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-sm font-semibold text-fg-muted">Onderdelen</h2>
      <p className="text-sm text-fg-muted">Sleep een onderdeel op het breadboard. Druk op R om te draaien.</p>
      <ul className="flex flex-col gap-2">
        {PRO_KINDS.map((kind) => (
          <li
            key={kind}
            draggable
            tabIndex={0}
            aria-label={`${LABELS[kind]} (${PRO_NAMES_NL[kind]}) — sleep naar het breadboard of druk op Enter om toe te voegen`}
            onKeyDown={(e) => { if (onAdd && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onAdd(kind) } }}
            onDragStart={(e) => {
              e.dataTransfer.setData(PRO_DRAG_TYPE, kind)
              e.dataTransfer.effectAllowed = 'copy'
              setDraggedKind(kind)
            }}
            onDragEnd={() => setDraggedKind(null)}
            className="flex cursor-grab items-center gap-3 rounded-ui border border-line bg-bg p-3 transition-colors duration-(--dur) hover:border-accent focus-visible:outline-2 focus-visible:outline-accent active:cursor-grabbing"
          >
            <Icon kind={kind} />
            <div>
              <div className="font-medium text-fg">{LABELS[kind]}</div>
              <div className="text-xs text-fg-muted">{HINTS[kind]}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
