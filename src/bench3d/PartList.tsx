import type { Part } from '../project/types'
import { partLabel } from './labels'

export interface PartListProps {
  parts: Part[]
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
export function PartList({ parts, locked, selectedId, onSelect, onRemove, onPress }: PartListProps) {
  if (parts.length === 0) return null
  return (
    <ul aria-label="Onderdelen op de werkbank" className="absolute left-3 top-3 z-10 flex flex-col items-start gap-1">
      {parts.map((part) => (
        <li key={part.id}>
          <button
            type="button"
            aria-pressed={part.id === selectedId}
            className="sr-only focus:not-sr-only rounded-ui border border-accent bg-panel px-2 py-1 text-sm text-fg focus-visible:outline-2 focus-visible:outline-accent"
            onClick={() => { if (!locked) onSelect(part) }}
            onKeyDown={(e) => {
              if ((e.key === 'Delete' || e.key === 'Backspace') && !locked) { e.preventDefault(); onRemove(part) }
              else if ((e.key === ' ' || e.key === 'Enter') && locked && !e.repeat) { e.preventDefault(); onPress(part, true) }
            }}
            onKeyUp={(e) => { if ((e.key === ' ' || e.key === 'Enter') && locked) onPress(part, false) }}
            onBlur={() => onPress(part, false)}
          >
            {partLabel(part)}
          </button>
        </li>
      ))}
    </ul>
  )
}
