import type { EngineStatus } from '../engine/protocol'

export interface RunControlsProps {
  status: EngineStatus
  onStart: () => void
  onStop: () => void
  onRetry: () => void
}

export function RunControls({ status, onStart, onStop, onRetry }: RunControlsProps) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-3 py-2">
      <button
        type="button"
        onClick={onStart}
        disabled={status !== 'klaar'}
        className="rounded-ui bg-accent px-5 py-2 font-semibold text-ink transition-opacity duration-(--dur) enabled:hover:opacity-90 disabled:opacity-40"
      >
        <span aria-hidden>▶ </span>Start
      </button>
      <button
        type="button"
        onClick={onStop}
        disabled={status !== 'draait'}
        className="rounded-ui border border-line px-5 py-2 font-semibold text-fg transition-colors duration-(--dur) enabled:hover:bg-line disabled:opacity-40"
      >
        <span aria-hidden>■ </span>Stop
      </button>
      {status === 'laden' && (
        <span className="flex items-center gap-2 text-sm text-fg-muted" role="status">
          <span aria-hidden className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
          Python wordt gestart…
        </span>
      )}
      {status === 'draait' && <span className="text-sm text-accent" role="status">Je programma draait</span>}
      {status === 'laadfout' && (
        <span className="flex items-center gap-2 text-sm" role="alert">
          <span className="text-danger">Python kon niet worden geladen</span>
          <button type="button" onClick={onRetry} className="rounded-ui border border-accent px-3 py-1 text-accent transition-colors duration-(--dur) hover:bg-accent hover:text-ink">
            Opnieuw proberen
          </button>
        </span>
      )}
    </div>
  )
}
