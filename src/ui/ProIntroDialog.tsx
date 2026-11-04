import { useEffect } from 'react'
import { useDialogFocus } from './useDialogFocus'

const KEY = 'pi-simulator:pro-intro-seen'

export function proIntroSeen(store: Pick<Storage, 'getItem'> | null = safeStore()): boolean {
  try { return store?.getItem(KEY) === '1' } catch { return false }
}
export function markProIntroSeen(store: Pick<Storage, 'setItem'> | null = safeStore()): void {
  try { store?.setItem(KEY, '1') } catch { /* opslag uit: dan zie je de uitleg de volgende keer weer */ }
}
function safeStore(): Storage | null {
  try { return localStorage } catch { return null }
}

/** Mini-breadboard: kolom 3 (a–e) en de plusrail lichten op om te laten zien wat er verbonden is. */
function MiniBoard() {
  const cols = 12
  const x = (c: number) => 22 + c * 17
  return (
    <svg viewBox="0 0 230 120" role="img" aria-label="Tekening van een breadboard met verbonden gaatjes" className="w-full max-w-sm">
      <rect x="4" y="4" width="222" height="112" rx="6" className="fill-bb" />
      <rect x="10" y="57" width="210" height="6" className="fill-bb-hole" />
      {[0, 1].map((r) => Array.from({ length: cols }, (_, c) => (
        <rect key={`rail-${r}-${c}`} x={x(c) - 3} y={r === 0 ? 10 : 100} width="6" height="6" className="fill-accent" />
      )))}
      {Array.from({ length: cols }, (_, c) => [0, 1, 2, 3, 4].map((r) => (
        <rect key={`t-${c}-${r}`} x={x(c) - 3} y={24 + r * 6.5} width="5" height="5" className={c === 3 ? 'fill-accent' : 'fill-bb-hole'} />
      )))}
      {Array.from({ length: cols }, (_, c) => [0, 1, 2, 3, 4].map((r) => (
        <rect key={`b-${c}-${r}`} x={x(c) - 3} y={69 + r * 6.5} width="5" height="5" className={c === 7 ? 'fill-accent' : 'fill-bb-hole'} />
      )))}
    </svg>
  )
}

export function ProIntroDialog({ onClose }: { onClose: () => void }) {
  const focus = useDialogFocus()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/70 p-8 pt-16" onClick={onClose}>
      <div role="dialog" aria-label="Wat is een breadboard?" ref={focus.ref} onKeyDown={focus.onKeyDown} className="w-full max-w-xl rounded-ui border border-line bg-panel p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-lg font-semibold">Wat is een breadboard?</h2>
        <div className="mb-3 flex justify-center"><MiniBoard /></div>
        <ul className="mb-4 flex list-disc flex-col gap-2 pl-5 text-sm text-fg-muted">
          <li>Een breadboard is een plankje met gaatjes waar je onderdelen zonder solderen in prikt.</li>
          <li>Onder de gaatjes liggen metalen strips. <strong className="text-fg">Vijf gaatjes boven elkaar in één kolom</strong> (a–e of f–j) zijn met elkaar verbonden. De groef in het midden scheidt de twee helften.</li>
          <li>De lange rijen aan de rand (<strong className="text-fg">rails</strong>) zijn over de hele lengte doorverbonden. Handig voor + (stroom) en − (GND).</li>
          <li>Een <strong className="text-fg">led</strong> heeft een lange poot (+) en een korte poot (−) en heeft altijd een weerstand nodig, anders brandt hij door.</li>
          <li>Een draad maak je door te klikken op een pin of gaatje en dan op een tweede. Ga je met de muis over een gaatje, dan lichten de gaatjes op die ermee verbonden zijn.</li>
        </ul>
        <div className="text-right">
          <button type="button" onClick={onClose} className="rounded-ui bg-accent px-4 py-2 font-semibold text-ink">Begrepen</button>
        </div>
      </div>
    </div>
  )
}
