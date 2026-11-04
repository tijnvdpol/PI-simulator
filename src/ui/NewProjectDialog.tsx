import { useEffect } from 'react'
import type { ProjectMode } from '../project/types'
import { useDialogFocus } from './useDialogFocus'

const CHOICES: { mode: ProjectMode; titel: string; uitleg: string }[] = [
  { mode: 'simple', titel: 'Simpel', uitleg: 'Sleep een led, knop of sensor naar de Pi en kies een pin. Geen draadjes of weerstanden. Het beste om te beginnen.' },
  { mode: 'pro', titel: 'Pro', uitleg: 'Bouw op een breadboard met losse draden en weerstanden, zoals in het echt. Een led zonder weerstand brandt door!' },
]

export function NewProjectDialog({ onCreate, onClose }: { onCreate: (mode: ProjectMode) => void; onClose: () => void }) {
  const focus = useDialogFocus()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/70 p-8 pt-24" onClick={onClose}>
      <div role="dialog" aria-label="Nieuw project" ref={focus.ref} onKeyDown={focus.onKeyDown} className="w-full max-w-xl rounded-ui border border-line bg-panel p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Nieuw project</h2>
          <button type="button" onClick={onClose} className="rounded-ui px-2 py-1 text-fg-muted transition-colors duration-(--dur) hover:bg-line">Sluiten</button>
        </div>
        <ul className="flex flex-col gap-3">
          {CHOICES.map((c) => (
            <li key={c.mode}>
              <button
                type="button"
                onClick={() => onCreate(c.mode)}
                className="flex w-full items-center justify-between gap-4 rounded-ui border border-line bg-bg p-4 text-left transition-colors duration-(--dur) hover:border-accent"
              >
                <span>
                  <span className="block font-medium">{c.titel}</span>
                  <span className="block text-sm text-fg-muted">{c.uitleg}</span>
                </span>
                <span className="shrink-0 rounded-ui bg-accent px-3 py-1 text-sm font-semibold text-ink">Maak</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
