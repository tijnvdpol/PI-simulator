import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { BuzzerSound } from '../audio/buzzer'
import { snapshot, syncAnalog } from '../bench/liveControls'
import { defaultDropPosition } from '../bench/partGeometry'
import { LazyBench3D, preloadBench3D } from '../bench3d/LazyBench3D'
import { LazyProBench3D, preloadProBench3D } from '../bench3d/pro/LazyProBench3D'
import { firstFreeAnchor } from '../circuit/parts'
import { useProRuntime } from '../circuit/useProRuntime'
import { NewProjectDialog } from './NewProjectDialog'
import { PRO_STARTER_CODE, STARTER_CODE } from './useProject'
import { ProIntroDialog, markProIntroSeen, proIntroSeen } from './ProIntroDialog'
import { ProPartsTray } from './ProPartsTray'
import { emptyProject, type ProjectMode } from '../project/types'
import { placeOnTable } from '../bench3d/placement'
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
import { appendCapped, consoleReducer, type NewLine } from './consoleState'
import { isDirty, useShareLinkListener, useUnsavedGuard } from './guards'
import { serializeProject } from '../project/parse'
import { EmptyState, ProEmptyState } from './EmptyState'
import { ExamplesMenu } from './ExamplesMenu'
import { ErrorCard } from './ErrorCard'
import { PartsTray } from './PartsTray'
import { RunControls } from './RunControls'
import { ShareDialog } from './ShareDialog'
import { ToastHost, useToasts } from './Toast'
import { TopBar } from './TopBar'
import { useProject } from './useProject'
import { resolveInitial, useProjectIO } from './useProjectIO'

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
  const initial = useMemo(() => resolveInitial(location.hash), [])
  const { project, mode, bench, pro, dispatchPro, code, setCode, dispatchBench, load } = useProject(initial.project ?? undefined)
  const proMode = mode === 'pro'
  const { toasts, show } = useToasts()
  const fileInput = useRef<HTMLInputElement>(null)
  const [examplesOpen, setExamplesOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [introOpen, setIntroOpen] = useState(false)
  const [pressedParts, setPressedParts] = useState<Record<string, boolean>>({})
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
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Console-uitvoer wordt hooguit 10× per seconde doorgezet, zodat een snelle print()-lus de pagina niet vertraagt.
  const flush = useCallback(() => {
    flushTimer.current = null
    const batch = pending.current
    pending.current = []
    if (batch.length) dispatchConsole({ type: 'batch', lines: batch })
  }, [])
  const queue = useCallback((l: NewLine) => {
    appendCapped(pending.current, l) // nooit meer dan 500 regels in de wachtrij, ook niet in een verborgen tabblad
    if (flushTimer.current === null) flushTimer.current = setTimeout(flush, 100)
  }, [flush])

  useEffect(() => {
    // De 3D-code en Pyodide laden tegelijk, niet na elkaar.
    preloadBench3D()
    if (initial.project?.mode === 'pro') preloadProBench3D()
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
    if (proMode) return
    hw.setParts(bench.parts)
    syncAnalog(hw, bench.parts, sensorValues)
  }, [hw, bench.parts, sensorValues, proMode])

  const live = useHardwareFrame((s) => snapshot(s, bench.parts, sensorValues), hw)
  const proResult = useProRuntime({ active: proMode, circuit: pro.present, hw, pressed: pressedParts, sensors: sensorValues, burnt: pro.burnt, dispatch: dispatchPro })
  const buzzing = proMode
    ? pro.present.parts.some((p) => p.kind === 'buzzer' && (proResult.parts[p.id]?.level ?? 0) > 0)
    : bench.parts.some((p) => p.kind === 'buzzer' && (live[p.id]?.level ?? 0) > 0)
  useEffect(() => { sound.setActive(buzzing) }, [sound, buzzing])
  useEffect(() => () => sound.dispose(), [sound])

  // Pro-modus: een kortsluiting stopt het programma, en wie begint met een kortsluiting kan niet starten.
  const shortShown = useRef(false)
  useEffect(() => {
    if (!proMode || !proResult.short) { shortShown.current = false; return }
    if (status === 'draait' && !shortShown.current) {
      shortShown.current = true
      engine.current?.stop()
      pending.current = []
      dispatchConsole({ type: 'sys', text: 'Kortsluiting! Je programma is gestopt. Haal de oorzaak weg en druk op Start.' })
    }
  }, [proMode, proResult.short, status])

  // De uitleg over het breadboard verschijnt de eerste keer dat je een pro-project opent.
  useEffect(() => {
    if (proMode && !proIntroSeen()) { setIntroOpen(true); preloadProBench3D() }
  }, [proMode])
  const closeIntro = () => { markProIntroSeen(); setIntroOpen(false) }

  const start = () => {
    if (proMode && proResult.short) {
      show('Er is een kortsluiting op je breadboard. Haal die eerst weg.', 'fout')
      return
    }
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

  // Een geladen deellink wordt uit de adresbalk gehaald, zodat een refresh je eigen werk niet overschrijft.
  const reported = useRef(false)
  useEffect(() => {
    if (initial.error && !reported.current) { reported.current = true; show(initial.error, 'fout') }
    if (/^#?p=/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search)
  }, [initial, show])

  // Wat er bij het laden/opslaan in het project stond; verschil = niet-opgeslagen werk.
  const baseline = useRef(serializeProject(project))
  const dirty = isDirty(baseline.current, project)
  useUnsavedGuard(dirty)

  const openProject = (p: Project) => {
    if (dirty && !window.confirm('Je hebt wijzigingen die je nog niet hebt opgeslagen. Als je nu een ander project opent, gaat je huidige werk verloren. Doorgaan?')) return
    if (status === 'draait') engine.current?.stop()
    pending.current = []
    dispatchConsole({ type: 'clear' })
    setExplanation(null)
    setIssues([])
    setSensorValues({})
    setPressedParts({})
    load(p)
    baseline.current = serializeProject(p)
  }
  useShareLinkListener(openProject, (message) => show(message, 'fout'))

  const createProject = (m: ProjectMode) => {
    setNewOpen(false)
    const fresh = emptyProject(m)
    openProject({ ...fresh, code: m === 'pro' ? PRO_STARTER_CODE : fresh.code || STARTER_CODE })
  }

  const io = useProjectIO({ project, openProject, toast: show, onSaved: () => { baseline.current = serializeProject(project) } })

  return (
    <div className="flex h-full min-w-[1100px] flex-col">
      <TopBar
        onNew={() => setNewOpen(true)}
        onExamples={() => setExamplesOpen(true)}
        onSave={io.save}
        onDownload={io.download}
        onOpenLast={io.openLast}
        onPickFile={() => fileInput.current?.click()}
        onShare={() => void io.share()}
      >
        <div className="flex items-center gap-2">
          <span className="rounded-ui border border-line px-2 py-1 text-xs text-fg-muted" data-testid="mode-badge">{proMode ? 'Pro-modus' : 'Simpele modus'}</span>
          {proMode && <button type="button" onClick={() => setIntroOpen(true)} className="rounded-ui px-3 py-1.5 text-sm text-fg-muted hover:bg-line">Uitleg breadboard</button>}
        </div>
      </TopBar>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        data-testid="project-file"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void io.importFile(f)
          e.target.value = ''
        }}
      />
      <ToastHost toasts={toasts} />
      {io.sharedUrl && <ShareDialog url={io.sharedUrl} onClose={io.closeShared} />}
      {newOpen && <NewProjectDialog onCreate={createProject} onClose={() => setNewOpen(false)} />}
      {introOpen && <ProIntroDialog onClose={closeIntro} />}
      <ExamplesMenu open={examplesOpen} onClose={() => setExamplesOpen(false)} onPick={openProject} />
      <main className="grid min-h-0 flex-1 grid-cols-[16rem_1fr_28rem]">
        <aside aria-label="Onderdelenbak" className="overflow-y-auto border-r border-line bg-panel">
          {proMode ? (
            <ProPartsTray
              onAdd={(kind) => {
                const spot = status !== 'draait' ? firstFreeAnchor(kind, pro.present.parts) : null
                if (spot) dispatchPro({ type: 'add', kind, ...spot, rot: 0 })
              }}
            />
          ) : (
            <PartsTray
              onAdd={(kind) => {
                if (status !== 'draait') {
                  const slot = defaultDropPosition(bench.parts)
                  dispatchBench({ type: 'add', kind, ...placeOnTable(slot.x, slot.y, bench.parts) })
                }
              }}
            />
          )}
        </aside>
        <section aria-label="Werkbank" className="relative min-h-0 bg-bg">
          {proMode ? (
            <LazyProBench3D
              circuit={pro.present}
              pending={pro.pending}
              error={pro.error}
              wireColor={pro.wireColor}
              canUndo={pro.past.length > 0}
              canRedo={pro.future.length > 0}
              burnt={pro.burnt}
              dispatch={dispatchPro}
              locked={status === 'draait'}
              result={proResult}
              sensors={{ values: sensorValues, onChange: (id, v) => setSensorValues((prev) => ({ ...prev, [id]: v })) }}
              pressed={pressedParts}
              onPress={(id, down) => setPressedParts((prev) => (!!prev[id] === down ? prev : { ...prev, [id]: down }))}
            >
              {pro.present.parts.length === 0 && pro.present.wires.length === 0 && <ProEmptyState />}
            </LazyProBench3D>
          ) : (
            <LazyBench3D
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
            </LazyBench3D>
          )}
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
