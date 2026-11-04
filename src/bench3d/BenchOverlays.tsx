import type { PinIssue } from '../engine/explainError'
import { LED_COLORS, type LedColor, type Part } from '../project/types'
import { PART_NAMES_NL, hasColor, isAnalog, type BenchAction } from '../bench/benchState'
import type { BenchWarning } from '../bench/warnings'
import type { PartIssue } from '../bench/partStatus'

const COLOR_LABELS: Record<LedColor, string> = { red: 'Rood', green: 'Groen', yellow: 'Geel', blue: 'Blauw', white: 'Wit' }
const COLOR_BG: Record<LedColor, string> = { red: 'bg-led-red', green: 'bg-led-green', yellow: 'bg-led-yellow', blue: 'bg-led-blue', white: 'bg-led-white' }

export interface BenchOverlaysProps {
  locked: boolean
  connectingPart?: Part
  /** Het pinmenu staat open en toont zelf de uitleg; dan hoeft de hint niet. */
  hideConnectHint?: boolean
  error: string | null
  selectedPart?: Part
  warnings: BenchWarning[]
  issues: PinIssue[]
  /** Meldingen over aansluitingen (ontbrekend, ongeschikt, geen voeding). */
  partIssues?: PartIssue[]
  dispatch: (a: BenchAction) => void
  onDeselect: () => void
}

/** HTML-laag over de 3D-scène: hints, foutmeldingen, kleurkeuze, verwijderknop en waarschuwingen. */
export function BenchOverlays({ locked, connectingPart, hideConnectHint, error, selectedPart, warnings, issues, partIssues = [], dispatch, onDeselect }: BenchOverlaysProps) {
  // Voeding en ongeschikte pinnen laten we altijd zien; "er mist nog iets" alleen voor het gekozen onderdeel (anders staat de werkbank vol).
  const shown = partIssues.filter((i) => i.code !== 'missing' || i.partId === selectedPart?.id)
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-3 flex flex-col items-center gap-2">
        {locked && (
          <div className="pointer-events-auto rounded-ui border border-line bg-panel px-3 py-1.5 text-sm text-fg-muted">Stop eerst om te bewerken</div>
        )}
        {connectingPart && !locked && !hideConnectHint && (
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
            {hasColor(selectedPart.kind) && LED_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={COLOR_LABELS[c]}
                aria-pressed={selectedPart.color === c}
                onClick={() => dispatch({ type: 'setColor', id: selectedPart.id, color: c })}
                className={`h-5 w-5 rounded-full border-2 ${selectedPart.color === c ? 'border-fg' : 'border-line'} ${COLOR_BG[c]}`}
              />
            ))}
            <button
              type="button"
              onClick={() => { dispatch({ type: 'remove', id: selectedPart.id }); onDeselect() }}
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
        {shown.map((i) => (
          <div key={`${i.partId}:${i.code}:${i.terminal ?? ''}`} role="status" data-issue={i.code} className="flex gap-2 rounded-ui border border-warning bg-panel p-3 text-sm">
            <span aria-hidden className="text-warning">⚠</span>
            <span>{i.message}</span>
          </div>
        ))}
        {issues.map((i) => (
          <div key={i.id} role="alert" className="flex gap-2 rounded-ui border border-danger bg-panel p-3 text-sm">
            <span aria-hidden className="text-danger">⛔</span>
            <span>{i.message}</span>
          </div>
        ))}
      </div>
    </>
  )
}
