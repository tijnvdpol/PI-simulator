import { loadPyodide, type PyodideInterface } from 'pyodide'
import { resolve } from 'node:path'
import { HardwareState, type HardwareBridge, type PinWarning } from '../hardwareState'
import { bootPython } from '../boot'
import type { Part, PartKind } from '../../project/types'

export interface RunError { type: string; message: string; line: number | null; traceback: string }
export type RunOutcome = { error: null } | { error: RunError }

/** Nep-hardwarebrug met een virtuele klok: `sleep` verhoogt de tijd in plaats van te wachten. */
export class FakeBridge implements HardwareBridge {
  readonly state = new HardwareState(new ArrayBuffer(HardwareState.BYTES))
  t: number
  limit = Infinity
  outputs = new Map<number, { t: number; level: number }[]>()
  warnings: { code: string; info: PinWarning }[] = []
  private events: { at: number; fn: () => void }[] = []

  constructor(t0 = 0) { this.t = t0 }

  setParts(parts: Part[]) { this.state.setParts(parts) }
  /** Voer `fn` uit zodra de virtuele klok `t` bereikt. */
  at(t: number, fn: () => void) { this.events.push({ at: t, fn }) }
  stopAfter(seconds: number) { this.limit = seconds }
  history(g: number) { return this.outputs.get(g) ?? [] }
  last(g: number) { return this.state.getOutput(g) }

  now() { return this.t }
  sleep(seconds: number) {
    this.t += Math.max(0, seconds)
    for (const e of this.events.filter((x) => x.at <= this.t)) { this.events.splice(this.events.indexOf(e), 1); e.fn() }
    if (this.t > this.limit) throw new Error('TestTimeLimit')
  }
  partKindAtGpio(g: number): PartKind | null { return this.state.partKindAtGpio(g) }
  partKindAtChannel(c: number): PartKind | null { return this.state.partKindAtChannel(c) }
  readButton(g: number) { return this.state.isButtonPressed(g) }
  writeOutput(g: number, level: number) {
    this.state.setOutput(g, level)
    const h = this.outputs.get(g) ?? []
    h.push({ t: this.t, level })
    this.outputs.set(g, h)
  }
  readAdc(c: number) { return this.state.getAdcRaw(c) }
  warn(code: 'pin-unconnected' | 'pin-wrong-kind', info: PinWarning) { this.warnings.push({ code, info }) }
}

export interface Harness {
  run(code: string): Promise<RunOutcome>
  bridge: FakeBridge
  stdout: string[]
  pyodide: PyodideInterface
}

let pyodidePromise: Promise<PyodideInterface> | undefined

/** Pyodide laadt één keer per testbestand; elke harnas krijgt een eigen brug. */
export async function createHarness(opts: { t0?: number } = {}): Promise<Harness> {
  pyodidePromise ??= loadPyodide({ indexURL: resolve('node_modules/pyodide') + '/' })
  const pyodide = await pyodidePromise
  const bridge = new FakeBridge(opts.t0 ?? 0)
  const stdout: string[] = []
  pyodide.setStdout({ batched: (s) => stdout.push(s) })
  pyodide.setStderr({ batched: (s) => stdout.push(s) })
  bootPython(pyodide, bridge)
  return {
    bridge,
    stdout,
    pyodide,
    async run(code: string): Promise<RunOutcome> {
      try {
        await pyodide.runPythonAsync(code)
        return { error: null }
      } catch (e) {
        const message = String((e as Error).message ?? e)
        const last = message.trim().split('\n').pop() ?? ''
        const m = /^([\w.]+):\s?(.*)$/.exec(last)
        return { error: { type: m?.[1] ?? 'Error', message: m?.[2] ?? last, line: null, traceback: message } }
      }
    },
  }
}
