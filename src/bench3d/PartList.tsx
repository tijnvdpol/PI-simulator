import type { PartLive } from '../bench/benchTypes'
import type { Part } from '../project/types'
import { partLabel } from './labels'

const ones = (b: number) => { let n = 0; for (let v = b; v; v &= v - 1) n++; return n }
/** Aantal aangezette pixels van een OLED (0 als hij uit staat), handig voor schermlezers en voor tests. */
const litPixels = (l: PartLive): number => (l.display?.on && l.readDisplay ? l.readDisplay().reduce((n, b) => n + ones(b), 0) : 0)

export interface PartListProps {
  parts: Part[]
  live?: (part: Part) => PartLive
  locked: boolean
  selectedId: string | null
  onSelect: (part: Part) => void
  onRemove: (part: Part) => void
  onPress: (part: Part, down: boolean) => void
}

/**
 * Toetsenbordtoegang tot de onderdelen: het 3D-canvas zelf is niet met Tab te bedienen. Deze lijst is alleen zichtbaar
 * als hij focus heeft (en voor schermlezers altijd aanwezig). Enter/spatie kiest een onderdeel om aan te sluiten,
 * Delete verwijdert het; tijdens het draaien drukken Enter/spatie een knop in.
 */
export function PartList({ parts, live, locked, selectedId, onSelect, onRemove, onPress }: PartListProps) {
  if (parts.length === 0) return null
  return (
    <ul aria-label="Onderdelen op de werkbank" className="absolute left-3 top-3 z-10 flex flex-col items-start gap-1">
      {parts.map((part) => {
        const l = live?.(part) ?? {}
        return (
        <li key={part.id}>
          <button
            type="button"
            data-part-id={part.id}
            data-kind={part.kind}
            data-glow={part.kind === 'led' ? ((l.level ?? 0) > 0 ? 'on' : 'off') : undefined}
            data-active={part.kind === 'buzzer' ? String((l.level ?? 0) > 0) : undefined}
            data-pressed={part.kind === 'button' ? String(!!l.pressed) : undefined}
            data-brightness={part.kind === 'pwmled' ? (l.level ?? 0).toFixed(2) : undefined}
            data-rgb={part.kind === 'rgbled' ? (l.rgb ?? [0, 0, 0]).map((x) => x.toFixed(1)).join(',') : undefined}
            data-servo={part.kind === 'servo' ? (typeof l.servo === 'number' ? l.servo.toFixed(2) : 'los') : undefined}
            data-distance={part.kind === 'distance' ? String(l.distanceCm ?? '') : undefined}
            data-lit={part.kind === 'oled' ? String(litPixels(l)) : undefined}
            aria-pressed={part.id === selectedId}
            className="sr-only focus:not-sr-only rounded-ui border border-accent bg-panel px-2 py-1 text-sm text-fg focus-visible:outline-2 focus-visible:outline-accent"
            onClick={() => { if (!locked) onSelect(part) }}
            onKeyDown={(e) => {
              if ((e.key === 'Delete' || e.key === 'Backspace') && !locked) { e.preventDefault(); onRemove(part) }
              else if ((e.key === ' ' || e.key === 'Enter') && locked && !e.repeat) { e.preventDefault(); onPress(part, true) }
            }}
            // Loslaten werkt ook als het programma ondertussen gestopt is, zodat een knop niet blijft hangen.
            onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') onPress(part, false) }}
            onBlur={() => onPress(part, false)}
          >
            {partLabel(part)}
          </button>
        </li>
        )
      })}
    </ul>
  )
}
