import { useEffect } from 'react'
import { useDialogFocus } from './useDialogFocus'

export function ShareDialog({ url, onClose }: { url: string; onClose: () => void }) {
  const focus = useDialogFocus()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/70 p-8 pt-24" onClick={onClose}>
      <div role="dialog" aria-label="Deellink" ref={focus.ref} onKeyDown={focus.onKeyDown} className="w-full max-w-xl rounded-ui border border-line bg-panel p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-2 text-lg font-semibold">Kopieer deze link</h2>
        <p className="mb-3 text-sm text-fg-muted">Je browser liet het kopiëren niet toe. Selecteer de link hieronder en kopieer hem zelf.</p>
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Deellink" className="w-full rounded-ui border border-line bg-bg px-3 py-2 font-mono text-sm" />
        <div className="mt-4 text-right">
          <button type="button" onClick={onClose} className="rounded-ui bg-accent px-4 py-2 font-semibold text-ink">Klaar</button>
        </div>
      </div>
    </div>
  )
}
