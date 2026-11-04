import { useCallback, useRef, useState } from 'react'
import type { ToastKind } from './useProjectIO'

export interface ToastItem { id: number; message: string; kind: ToastKind }

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const next = useRef(1)
  const show = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = next.current++
    setToasts((t) => [...t, { id, message, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'fout' ? 6000 : 3000)
  }, [])
  return { toasts, show }
}

const BORDER: Record<ToastKind, string> = { ok: 'border-accent', info: 'border-line', fout: 'border-danger' }

export function ToastHost({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-in pointer-events-auto max-w-lg rounded-ui border ${BORDER[t.kind]} bg-panel px-4 py-2 text-sm shadow-lg`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
