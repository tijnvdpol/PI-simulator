import { checkEnvironment } from '../engine/environment'
import { EmptyState } from './EmptyState'
import { PartsTray } from './PartsTray'
import { TopBar } from './TopBar'
import { useProject } from './useProject'

export function App() {
  const env = checkEnvironment()
  const { bench, code, setCode } = useProject()

  if (!env.ok) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div role="alert" className="max-w-xl rounded-ui border border-danger bg-panel p-6">
          <h1 className="mb-2 text-lg font-semibold text-danger">Deze pagina kan hier niet draaien</h1>
          <p className="text-fg-muted">{env.melding}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-w-[1100px] flex-col">
      <TopBar />
      <main className="grid min-h-0 flex-1 grid-cols-[16rem_1fr_28rem]">
        <aside aria-label="Onderdelenbak" className="overflow-y-auto border-r border-line bg-panel">
          <PartsTray />
        </aside>
        <section aria-label="Werkbank" className="relative min-h-0 bg-bg">
          {bench.parts.length === 0 && <EmptyState onOpenExamples={() => {}} />}
        </section>
        <section aria-label="Code" className="flex min-h-0 flex-col border-l border-line bg-panel">
          <textarea
            aria-label="Python-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 resize-none bg-bg p-3 font-mono text-sm outline-none"
          />
        </section>
      </main>
    </div>
  )
}
