import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { BuzzerSound } from '../audio/buzzer'
import { Bench } from '../bench/components/Bench'
import { snapshot, syncAnalog } from '../bench/liveControls'
import { useHardwareFrame } from '../bench/useHardwareFrame'
import { checkEnvironment } from '../engine/environment'
import { explainError, explainPinWarning, type ErrorExplanation, type PinIssue } from '../engine/explainError'
import { HardwareState } from '../engine/hardwareState'
import type { EngineStatus } from '../engine/protocol'
import { PythonEngine, type WorkerLike } from '../engine/pythonEngine'
import { pinByPhysical } from '../pinout/pinout'
import type { Project } from '../project/types'
import { CodeEditor, type CodeEditorHandle } from './CodeEditor'
import { Console } from './Console'
import { consoleReducer, type NewLine } from './consoleState'
import { EmptyState } from './EmptyState'
import { ExamplesMenu } from './ExamplesMenu'
import { ErrorCard } from './ErrorCard'
import { PartsTray } from './PartsTray'
import { RunControls } from './RunControls'
import { TopBar } from './TopBar'
import { useProject } from './useProject'

export function App() {
  const env = checkEnvironment()
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
  return <Simulator />
}

function Simulator() {
  const { bench, code, setCode, dispatchBench, load } = useProject()
  const [examplesOpen, setExamplesOpen] = useState(false)
  const hw = useMemo(() => new HardwareState(), [])
  const sound = useMemo(() => new BuzzerSound(), [])
  const editor = useRef<CodeEditorHandle>(null)
  const [sensorValues, setSensorValues] = useState<Record<string, number>>({})
  const [status, setStatus] = useState<EngineStatus>('laden')
  const [lines, dispatchConsole] = useReducer(consoleReducer, [])
  const [explanation, setExplanation] = useState<ErrorExplanation | null>(null)
  const [issues, setIssues] = useState<PinIssue[]>([])
  const engine = useRef<PythonEngine | null>(null)
  const pending = useRef<NewLine[]>([])
  const raf = useRef(0)

  // Console-uitvoer wordt per animatieframe gebundeld, zodat een snelle print()-lus de pagina niet vertraagt.
  const flush = useCallback(() => {
    raf.current = 0
    const batch = pending.current
    pending.current = []
    if (batch.length) dispatchConsole({ type: 'batch', lines: batch })
  }, [])
  const queue = useCallback((l: NewLine) => {
    pending.current.push(l)
    if (!raf.current) raf.current = requestAnimationFrame(flush)
  }, [flush])

  useEffect(() => {
    const e = new PythonEngine({
      state: hw,
      createWorker: () => new Worker(new URL('../engine/worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike,
      onStatus: setStatus,
      onOutput: (l) => queue({ stream: l.stream === 'stdout' ? 'out' : 'err', text: l.text }),
      onWarn: (w) => {
        const issue = explainPinWarning(w)
        setIssues((prev) => (prev.some((i) => i.id === issue.id) ? prev : [...prev, issue]))
      },
      onDone: (err) => {
        if (err) setExplanation(explainError(err))
        else queue({ stream: 'sys', text: 'Je programma is klaar.' })
      },
    })
    engine.current = e
    return () => { e.dispose(); engine.current = null }
  }, [hw, queue])

  // Onderdelen en sensorwaarden staan altijd in het gedeelde geheugen, zodat Python ze kan lezen.
  useEffect(() => {
    hw.setParts(bench.parts)
    syncAnalog(hw, bench.parts, sensorValues)
  }, [hw, bench.parts, sensorValues])

  const live = useHardwareFrame((s) => snapshot(s, bench.parts, sensorValues), hw)
  const buzzing = bench.parts.some((p) => p.kind === 'buzzer' && (live[p.id]?.level ?? 0) > 0)
  useEffect(() => { sound.setActive(buzzing) }, [sound, buzzing])
  useEffect(() => () => sound.dispose(), [sound])

  const start = () => {
    void sound.unlock() // geluid mag pas na een klik
    pending.current = []
    dispatchConsole({ type: 'clear' })
    setExplanation(null)
    setIssues([])
    engine.current?.start(code)
  }
  const stop = () => {
    engine.current?.stop()
    pending.current = []
    dispatchConsole({ type: 'sys', text: 'Gestopt.' })
  }

  const openProject = (p: Project) => {
    if (status === 'draait') engine.current?.stop()
    pending.current = []
    dispatchConsole({ type: 'clear' })
    setExplanation(null)
    setIssues([])
    setSensorValues({})
    load(p)
  }

  return (
    <div className="flex h-full min-w-[1100px] flex-col">
      <TopBar onExamples={() => setExamplesOpen(true)} />
      <ExamplesMenu open={examplesOpen} onClose={() => setExamplesOpen(false)} onPick={openProject} />
      <main className="grid min-h-0 flex-1 grid-cols-[16rem_1fr_28rem]">
        <aside aria-label="Onderdelenbak" className="overflow-y-auto border-r border-line bg-panel">
          <PartsTray />
        </aside>
        <section aria-label="Werkbank" className="relative min-h-0 bg-bg">
          <Bench
            parts={bench.parts}
            connecting={bench.connecting}
            error={bench.error}
            locked={status === 'draait'}
            dispatch={dispatchBench}
            issues={issues}
            live={(part) => live[part.id] ?? {}}
            onPartPress={(part, pressed) => {
              const c = part.connection
              if (c?.type === 'pin') {
                const g = pinByPhysical(c.physical).gpio
                if (g !== null) hw.setButtonPressed(g, pressed)
              }
            }}
            sensors={{ values: sensorValues, onChange: (part, v) => setSensorValues((prev) => ({ ...prev, [part.id]: v })) }}
          >
            {bench.parts.length === 0 && <EmptyState onOpenExamples={() => setExamplesOpen(true)} />}
          </Bench>
        </section>
        <section aria-label="Code" className="flex min-h-0 flex-col border-l border-line bg-panel">
          <RunControls status={status} onStart={start} onStop={stop} onRetry={() => engine.current?.retry()} />
          <CodeEditor ref={editor} value={code} onChange={setCode} errorLine={explanation?.regel ?? null} />
          <Console lines={lines} onClear={() => dispatchConsole({ type: 'clear' })}>
            {explanation && <ErrorCard explanation={explanation} onGotoLine={(n) => editor.current?.goToLine(n)} />}
          </Console>
        </section>
      </main>
    </div>
  )
}
