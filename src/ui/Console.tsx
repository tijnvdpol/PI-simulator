import { useEffect, useRef, type ReactNode } from 'react'
import type { ConsoleLine } from './consoleState'

export function Console({ lines, onClear, children }: { lines: ConsoleLine[]; onClear: () => void; children?: ReactNode }) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'end' }) }, [lines])
  return (
    <div className="flex h-56 flex-col border-t border-line bg-panel">
      <div className="flex items-center justify-between px-3 py-1.5">
        <h2 className="text-sm font-semibold text-fg-muted">Console</h2>
        <button type="button" onClick={onClear} className="rounded-ui px-2 py-1 text-xs text-fg-muted transition-colors duration-(--dur) hover:bg-line">Wissen</button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-2 font-mono text-sm">
        {children && <div className="mb-2 font-sans">{children}</div>}
        {lines.length === 0 && !children && <p className="font-sans text-fg-muted">Hier verschijnt wat je programma met print() laat zien.</p>}
        {lines.map((l) => (
          <div key={l.id} className={l.stream === 'err' ? 'text-danger' : l.stream === 'sys' ? 'text-fg-muted italic' : 'text-fg'}>{l.text}</div>
        ))}
        <div ref={end} />
      </div>
    </div>
  )
}
