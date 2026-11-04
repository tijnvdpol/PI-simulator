import { PART_NAMES_NL } from '../bench/benchState'
import { PART_KINDS, type PartKind } from '../project/types'
import { PartIcon } from './PartIcon'

export const DRAG_TYPE = 'application/x-pisim-part'

const LABELS: Record<PartKind, string> = {
  led: 'Led', button: 'Knop', buzzer: 'Buzzer', temperature: 'Temperatuursensor', potentiometer: 'Potmeter',
}
const HINTS: Record<PartKind, string> = {
  led: 'Een lampje dat je aan en uit zet',
  button: 'Voelt of je erop drukt',
  buzzer: 'Maakt een piepgeluid',
  temperature: 'Meet hoe warm het is',
  potentiometer: 'Een draaiknop met een stand',
}

export function PartsTray({ onAdd }: { onAdd?: (kind: PartKind) => void }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-sm font-semibold text-fg-muted">Onderdelen</h2>
      <p className="text-sm text-fg-muted">Sleep een onderdeel naar de werkbank.</p>
      <ul className="flex flex-col gap-2">
        {PART_KINDS.map((kind) => (
          <li
            key={kind}
            draggable
            tabIndex={0}
            aria-label={`${LABELS[kind]} (${PART_NAMES_NL[kind]}) — sleep naar de werkbank of druk op Enter om toe te voegen`}
            onKeyDown={(e) => { if (onAdd && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onAdd(kind) } }}
            onDragStart={(e) => {
              e.dataTransfer.setData(DRAG_TYPE, kind)
              e.dataTransfer.effectAllowed = 'copy'
            }}
            className="flex cursor-grab focus-visible:outline-2 focus-visible:outline-accent items-center gap-3 rounded-ui border border-line bg-bg p-3 transition-colors duration-(--dur) hover:border-accent active:cursor-grabbing"
          >
            <PartIcon kind={kind} />
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
