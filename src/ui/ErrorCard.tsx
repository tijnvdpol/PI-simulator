import type { ErrorExplanation } from '../engine/explainError'

export function ErrorCard({ explanation, onGotoLine }: { explanation: ErrorExplanation; onGotoLine: (line: number) => void }) {
  return (
    <div role="alert" className="rounded-ui border border-danger bg-bg p-3">
      <div className="flex gap-3">
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden className="mt-0.5 shrink-0">
          <circle cx="12" cy="12" r="11" className="fill-danger" />
          <rect x="11" y="6" width="2" height="8" rx="1" className="fill-ink" />
          <circle cx="12" cy="17.5" r="1.4" className="fill-ink" />
        </svg>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-danger">{explanation.titel}</div>
          <p className="mt-1 text-fg">{explanation.uitleg}</p>
          {explanation.regel !== null && (
            <button
              type="button"
              onClick={() => onGotoLine(explanation.regel!)}
              className="mt-2 rounded-ui border border-line px-2 py-1 text-sm text-fg-muted transition-colors duration-(--dur) hover:border-accent hover:text-accent"
            >
              Ga naar regel {explanation.regel}
            </button>
          )}
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-fg-muted">Technische melding</summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-ui bg-ink p-2 font-mono text-xs text-fg-muted">{explanation.technisch}</pre>
          </details>
        </div>
      </div>
    </div>
  )
}
