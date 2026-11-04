import { useEffect, useRef, useState } from 'react'

export interface MenuItem { label: string; onSelect: () => void }

/** Knop met een klein keuzemenu eronder. */
export function Menu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); window.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-ui px-3 py-2 text-sm font-medium text-fg transition-colors duration-(--dur) hover:bg-line"
      >
        {label}
      </button>
      {open && (
        <ul role="menu" className="absolute left-0 top-full z-40 mt-1 min-w-56 rounded-ui border border-line bg-panel p-1 shadow-xl">
          {items.map((it) => (
            <li key={it.label} role="none">
              <button
                role="menuitem"
                type="button"
                onClick={() => { setOpen(false); it.onSelect() }}
                className="w-full rounded-ui px-3 py-2 text-left text-sm transition-colors duration-(--dur) hover:bg-line"
              >
                {it.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
