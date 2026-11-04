import { useEffect } from 'react'
import { EXAMPLES } from '../examples'
import type { Project } from '../project/types'

export function ExamplesMenu({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (p: Project) => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/70 p-8 pt-24" onClick={onClose}>
      <div role="dialog" aria-label="Voorbeelden" className="w-full max-w-xl rounded-ui border border-line bg-panel p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Kies een voorbeeld</h2>
          <button type="button" onClick={onClose} className="rounded-ui px-2 py-1 text-fg-muted transition-colors duration-(--dur) hover:bg-line">Sluiten</button>
        </div>
        <ul className="flex flex-col gap-3">
          {EXAMPLES.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => { onPick(structuredClone(e.project)); onClose() }}
                className="flex w-full items-center justify-between gap-4 rounded-ui border border-line bg-bg p-4 text-left transition-colors duration-(--dur) hover:border-accent"
              >
                <span>
                  <span className="block font-medium">{e.titel}</span>
                  <span className="block text-sm text-fg-muted">{e.uitleg}</span>
                </span>
                <span className="shrink-0 rounded-ui bg-accent px-3 py-1 text-sm font-semibold text-ink">Open</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
