import { useEffect, useMemo, useState } from 'react'
import { BuzzerSound } from '../audio/buzzer'
import { Bench } from '../bench/components/Bench'
import { snapshot, syncAnalog } from '../bench/liveControls'
import { useHardwareFrame } from '../bench/useHardwareFrame'
import { HardwareState } from '../engine/hardwareState'
import { pinByPhysical } from '../pinout/pinout'
import { checkEnvironment } from '../engine/environment'
import { EmptyState } from './EmptyState'
import { PartsTray } from './PartsTray'
import { TopBar } from './TopBar'
import { useProject } from './useProject'

export function App() {
  const env = checkEnvironment()
  const { bench, code, setCode, dispatchBench } = useProject()
  const hw = useMemo(() => new HardwareState(), [])
  const sound = useMemo(() => new BuzzerSound(), [])
  const [sensorValues, setSensorValues] = useState<Record<string, number>>({})

  // Onderdelen en sensorwaarden staan altijd in het gedeelde geheugen, zodat Python ze kan lezen.
  useEffect(() => {
    hw.setParts(bench.parts)
    syncAnalog(hw, bench.parts, sensorValues)
  }, [hw, bench.parts, sensorValues])

  const live = useHardwareFrame((s) => snapshot(s, bench.parts, sensorValues), hw)
  const buzzing = bench.parts.some((p) => p.kind === 'buzzer' && (live[p.id]?.level ?? 0) > 0)
  useEffect(() => { sound.setActive(buzzing) }, [sound, buzzing])
  useEffect(() => () => sound.dispose(), [sound])

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
          <Bench parts={bench.parts} connecting={bench.connecting} error={bench.error} locked={false}
            dispatch={dispatchBench}
            live={(part) => live[part.id] ?? {}}
            onPartPress={(part, pressed) => {
              const c = part.connection
              if (c?.type === 'pin') { const g = pinByPhysical(c.physical).gpio; if (g !== null) hw.setButtonPressed(g, pressed) }
            }}
            sensors={{ values: sensorValues, onChange: (part, v) => setSensorValues((prev) => ({ ...prev, [part.id]: v })) }}
          >
            {bench.parts.length === 0 && <EmptyState onOpenExamples={() => {}} />}
          </Bench>
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
