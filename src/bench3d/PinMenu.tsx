import { useEffect, useRef } from 'react'
import { PART_NAMES_NL, isAnalog, type Targets } from '../bench/benchState'
import { terminalsOf } from '../bench/terminals'
import { PINS, type PiPin, type PinKind } from '../pinout/pinout'
import type { Connection, Part } from '../project/types'
import { partLabel } from './labels'

const KIND_STYLE: Record<PinKind, string> = {
  gpio: 'border-accent text-fg',
  '5v': 'border-danger text-danger',
  '3v3': 'border-warning text-warning',
  gnd: 'border-line text-fg-muted',
  id: 'border-line text-fg-muted',
}
const KIND_NAME: Record<PinKind, string> = { gpio: 'GPIO', '5v': '5V', '3v3': '3,3V', gnd: 'GND', id: 'ID' }

export interface PinMenuProps {
  part: Part
  /** Wat er gekozen mag worden voor de actieve aansluiting (uit `selectableTargets`). */
  targets: Pick<Targets, 'pins' | 'channels'> & Partial<Pick<Targets, 'suggested' | 'reasons'>>
  /** De aansluiting waar nu een pin voor gekozen wordt (standaard de eerste). */
  terminal?: string
  onPick: (target: Connection) => void
  onClose: () => void
  /** Een andere aansluiting kiezen (alleen bij onderdelen met meerdere aansluitingen). */
  onTerminal?: (terminal: string) => void
  /** Alle lege aansluitingen op de voorgestelde pinnen zetten. */
  onAuto?: () => void
}

const describePin = (physical: number): string => {
  const pin = PINS[physical - 1]
  return pin.gpio !== null ? `GPIO ${pin.gpio}` : pin.naam
}

const connectionText = (c: Connection | undefined): string => (c === undefined ? 'nog niet aangesloten' : c.type === 'adc' ? `kanaal CH${c.channel}` : `pin ${c.physical} (${describePin(c.physical)})`)

function PinButton({ pin, enabled, onPick, suggested, current, reason: why }: { pin: PiPin; enabled: boolean; onPick: () => void; suggested?: boolean; current?: boolean; reason?: string }) {
  const reason = pin.kind === 'id' ? 'Gereserveerd voor uitbreidingskaarten' : enabled ? `${suggested ? 'Voorgesteld · ' : ''}${pin.functie}` : why || 'Al in gebruik door een ander onderdeel'
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onPick}
      title={reason}
      aria-label={`Pin ${pin.physical}, ${pin.naam}`}
      data-suggested={suggested ? 'true' : undefined}
      aria-current={current ? 'true' : undefined}
      className={`${suggested ? 'ring-2 ring-accent ' : ''}${current ? 'bg-line ' : ''}flex items-center justify-between gap-2 rounded-ui border px-2 py-0.5 text-left text-xs transition-colors duration-(--dur) enabled:hover:bg-line disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-accent ${KIND_STYLE[pin.kind]}`}
    >
      <span className="tabular-nums text-fg-muted">{pin.physical}</span>
      <span className="font-medium">{pin.gpio !== null ? `GPIO ${pin.gpio}` : pin.naam}</span>
    </button>
  )
}

/**
 * Overzicht van de 40 pinnen in pinout-vorm (twee kolommen: oneven links, even rechts, pin 1 bovenaan), zoals op een
 * pinout-kaart. Voor analoge onderdelen een lijst met de kanalen van de MCP3008-chip.
 */
export function PinMenu({ part, targets, terminal, onPick, onClose, onTerminal, onAuto }: PinMenuProps) {
  const analog = isAnalog(part.kind)
  const specs = terminalsOf(part.kind)
  const multi = specs.length > 1
  const spec = specs.find((t) => t.id === terminal) ?? specs[0]
  const current = part.connections[spec.id]
  const first = useRef<HTMLButtonElement>(null)
  useEffect(() => { first.current?.focus() }, [part.id])

  return (
    <aside
      aria-label={`Aansluiten: ${partLabel(part)}`}
      className="absolute right-3 top-3 z-10 flex max-h-[calc(100%-5.5rem)] w-72 flex-col rounded-ui border border-accent bg-panel shadow-lg"
    >
      <header className="flex items-start justify-between gap-2 border-b border-line p-3">
        <div>
          <h2 className="text-sm font-semibold text-fg">
            {multi ? `Aansluitingen van de ${PART_NAMES_NL[part.kind]}` : analog ? `Kanaal voor de ${PART_NAMES_NL[part.kind]}` : `Pin voor de ${PART_NAMES_NL[part.kind]}`}
          </h2>
          <p className="text-xs text-fg-muted">{analog ? 'Kies een kanaal van de chip.' : 'Kies een pin; de draad verschijnt in 3D.'}</p>
        </div>
        <button
          ref={first}
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="rounded-ui px-2 py-0.5 text-fg-muted transition-colors duration-(--dur) hover:bg-line hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
        >
          ✕
        </button>
      </header>
      <div className="overflow-y-auto p-3">
        {multi && (
          <>
            <div role="group" aria-label="Aansluitingen" className="mb-3 flex flex-col gap-1">
              {specs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={t.id === spec.id}
                  onClick={() => onTerminal?.(t.id)}
                  className={`flex items-center justify-between gap-2 rounded-ui border px-2 py-1 text-left text-xs transition-colors duration-(--dur) hover:bg-line focus-visible:outline-2 focus-visible:outline-accent ${t.id === spec.id ? 'border-accent text-fg' : 'border-line text-fg-muted'}`}
                >
                  <span className="font-medium">{t.label}</span>
                  <span className={part.connections[t.id] ? 'text-fg-muted' : 'text-warning'}>{connectionText(part.connections[t.id])}</span>
                </button>
              ))}
            </div>
            <p className="mb-3 text-xs text-fg-muted">{spec.why}</p>
            <button
              type="button"
              onClick={() => onAuto?.()}
              className="mb-3 w-full rounded-ui border border-accent px-2 py-1 text-xs text-fg transition-colors duration-(--dur) hover:bg-line focus-visible:outline-2 focus-visible:outline-accent"
            >
              Sluit alles voorgesteld aan
            </button>
          </>
        )}
        {analog ? (
          <div className="grid grid-cols-2 gap-1" role="group" aria-label="Kanalen van de chip">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((c) => {
              const ok = targets.channels.includes(c)
              return (
                <button
                  key={c}
                  type="button"
                  disabled={!ok}
                  onClick={() => onPick({ type: 'adc', channel: c })}
                  title={ok ? `Kanaal ${c} van de chip` : 'Al in gebruik door een ander onderdeel'}
                  className="rounded-ui border border-accent px-2 py-1 text-left text-sm text-fg transition-colors duration-(--dur) enabled:hover:bg-line disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-accent"
                >
                  CH{c}
                </button>
              )
            })}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1" role="group" aria-label="Pinnen van de Pi">
              {Array.from({ length: 20 }, (_, row) => [PINS[row * 2], PINS[row * 2 + 1]]).flat().map((pin) => (
                <PinButton
                  key={pin.physical}
                  pin={pin}
                  enabled={targets.pins.includes(pin.physical)}
                  suggested={targets.suggested?.[0] === pin.physical || (targets.suggested?.includes(pin.physical) && spec.only !== undefined)}
                  current={current?.type === 'pin' && current.physical === pin.physical}
                  reason={targets.reasons?.[pin.physical]}
                  onPick={() => onPick({ type: 'pin', physical: pin.physical })}
                />
              ))}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-fg-muted" aria-label="Legenda">
              {(['gpio', '5v', '3v3', 'gnd'] as PinKind[]).map((k) => (
                <li key={k} className="flex items-center gap-1">
                  <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-sm border ${KIND_STYLE[k].split(' ')[0]}`} />
                  {KIND_NAME[k]}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </aside>
  )
}
