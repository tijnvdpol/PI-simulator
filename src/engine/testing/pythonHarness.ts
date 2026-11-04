import { loadPyodide, type PyodideInterface } from 'pyodide'
import { resolve } from 'node:path'
import { HardwareState, type HardwareBridge, type PinWarning } from '../hardwareState'
import { bootPython } from '../boot'
import type { Part, PartKind } from '../../project/types'
import { PILLOW_WHEEL } from '../pillow'

export interface RunError { type: string; message: string; line: number | null; traceback: string }
export type RunOutcome = { error: null } | { error: RunError }

/** Nep-hardwarebrug met een virtuele klok: `sleep` verhoogt de tijd in plaats van te wachten. */
export class FakeBridge implements HardwareBridge {
  readonly state = new HardwareState(new ArrayBuffer(HardwareState.BYTES))
  t: number
  limit = Infinity
  outputs = new Map<number, { t: number; level: number }[]>()
  servos = new Map<number, { t: number; position: number | null }[]>()
  /** Elk beeld dat het (nep-)OLED kreeg, met het tijdstip. */
  frames: { t: number; data: Uint8Array }[] = []
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
  readDistance(g: number) { return this.state.getDistanceCm(g) }
  writeServo(g: number, position: number | null) {
    this.state.setServo(g, position)
    const h = this.servos.get(g) ?? []
    h.push({ t: this.t, position })
    this.servos.set(g, h)
  }
  servoHistory(g: number) { return this.servos.get(g) ?? [] }
  i2cPresent(address: number) { return this.state.i2cPresent(address) }
  writeDisplay(bytes: Uint8Array) { this.state.setDisplay(bytes); this.frames.push({ t: this.t, data: new Uint8Array(bytes) }) }
  setDisplayOn(on: boolean) { this.state.setDisplayOn(on) }
  setContrast(level: number) { this.state.setContrast(level) }
  /** Pixel (x, y) van het laatste beeld: true = aan. */
  pixel(x: number, y: number): boolean {
    const d = this.state.getDisplay()
    return ((d[y * 16 + (x >> 3)] >> (7 - (x & 7))) & 1) === 1
  }
  litPixels(): number { return this.state.getDisplay().reduce((n, b) => n + b.toString(2).replace(/0/g, '').length, 0) }
  warn(code: 'pin-unconnected' | 'pin-wrong-kind', info: PinWarning) { this.warnings.push({ code, info }) }
}

export interface Harness {
  run(code: string): Promise<RunOutcome>
  bridge: FakeBridge
  stdout: string[]
  pyodide: PyodideInterface
}

let pyodidePromise: Promise<PyodideInterface> | undefined
let current: FakeBridge

// `_hw` wordt maar één keer geregistreerd (Python bewaart de module); deze brug wijst naar de huidige FakeBridge.
const delegate: HardwareBridge = {
  now: () => current.now(),
  sleep: (s) => current.sleep(s),
  partKindAtGpio: (g) => current.partKindAtGpio(g),
  partKindAtChannel: (c) => current.partKindAtChannel(c),
  readButton: (g) => current.readButton(g),
  writeOutput: (g, l) => current.writeOutput(g, l),
  readAdc: (c) => current.readAdc(c),
  readDistance: (g) => current.readDistance(g),
  writeServo: (g, p) => current.writeServo(g, p),
  i2cPresent: (a) => current.i2cPresent(a),
  writeDisplay: (b) => current.writeDisplay(b),
  setDisplayOn: (on) => current.setDisplayOn(on),
  setContrast: (l) => current.setContrast(l),
  warn: (code, info) => current.warn(code, info),
}

/** Pyodide laadt één keer per testbestand; elke harnas krijgt een eigen brug en schone Python-toestand. */
export async function createHarness(opts: { t0?: number } = {}): Promise<Harness> {
  if (!pyodidePromise) {
    pyodidePromise = loadPyodide({ indexURL: resolve('node_modules/pyodide') + '/' }).then(async (p) => {
      await p.loadPackage(resolve('vendor/pyodide', PILLOW_WHEEL)) // Pillow, voor ImageDraw (zelfde wheel als in de app)
      bootPython(p, delegate)
      return p
    })
  }
  const pyodide = await pyodidePromise
  const bridge = new FakeBridge(opts.t0 ?? 0)
  current = bridge
  const stdout: string[] = []
  pyodide.setStdout({ batched: (s) => stdout.push(s) })
  pyodide.setStderr({ batched: (s) => stdout.push(s) })
  pyodide.runPython('import pisim.runtime; pisim.runtime.reset()')
  return {
    bridge,
    stdout,
    pyodide,
    async run(code: string): Promise<RunOutcome> {
      const runner = pyodide.pyimport('pisim.runner')
      const res = runner.run(code)
      runner.destroy()
      if (res === undefined || res === null) return { error: null }
      const error = res.toJs({ dict_converter: Object.fromEntries }) as RunError
      res.destroy()
      return { error }
    },
  }
}

let nextId = 0
/** Onderdeel op een fysieke pin, voor tests. */
export const onPin = (kind: PartKind, physical: number): Part => ({ id: `t${nextId++}`, kind, x: 0, y: 0, connections: { signal: { type: 'pin', physical } } })
/** Onderdeel op een ADC-kanaal, voor tests. */
export const onChannel = (kind: PartKind, channel: number): Part => ({ id: `t${nextId++}`, kind, x: 0, y: 0, connections: { signal: { type: 'adc', channel } } })
