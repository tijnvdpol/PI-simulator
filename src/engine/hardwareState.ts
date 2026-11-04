import { pinByPhysical } from '../pinout/pinout'
import { PART_KINDS, type Part, type PartKind } from '../project/types'

export const GPIO_COUNT = 28
export const ADC_CHANNELS = 8

// Indeling van de Int32Array over de buffer.
const KIND_GPIO = 0
const KIND_CH = KIND_GPIO + GPIO_COUNT
const BUTTON = KIND_CH + ADC_CHANNELS
const OUTPUT = BUTTON + GPIO_COUNT
const ADC = OUTPUT + GPIO_COUNT
const SLEEP = ADC + ADC_CHANNELS
const TOTAL = SLEEP + 1

const OUT_SCALE = 1000

const kindCode = (k: PartKind) => PART_KINDS.indexOf(k) + 1
const kindFromCode = (c: number): PartKind | null => (c > 0 ? PART_KINDS[c - 1] ?? null : null)

/** Gedeeld geheugen tussen hoofdthread (UI) en worker (Python). */
export class HardwareState {
  static readonly BYTES = TOTAL * 4
  readonly buffer: SharedArrayBuffer | ArrayBuffer
  private readonly a: Int32Array

  constructor(buffer?: SharedArrayBuffer | ArrayBuffer) {
    this.buffer = buffer ?? new SharedArrayBuffer(HardwareState.BYTES)
    this.a = new Int32Array(this.buffer)
  }

  setParts(parts: Part[]): void {
    this.a.fill(0, KIND_GPIO, KIND_CH + ADC_CHANNELS)
    for (const p of parts) {
      const c = p.connection
      if (!c) continue
      if (c.type === 'adc') {
        Atomics.store(this.a, KIND_CH + c.channel, kindCode(p.kind))
      } else {
        const g = pinByPhysical(c.physical).gpio
        if (g !== null) Atomics.store(this.a, KIND_GPIO + g, kindCode(p.kind))
      }
    }
  }

  partKindAtGpio(g: number): PartKind | null {
    return g >= 0 && g < GPIO_COUNT ? kindFromCode(Atomics.load(this.a, KIND_GPIO + g)) : null
  }
  partKindAtChannel(c: number): PartKind | null {
    return c >= 0 && c < ADC_CHANNELS ? kindFromCode(Atomics.load(this.a, KIND_CH + c)) : null
  }

  setButtonPressed(g: number, pressed: boolean): void { Atomics.store(this.a, BUTTON + g, pressed ? 1 : 0) }
  isButtonPressed(g: number): boolean { return Atomics.load(this.a, BUTTON + g) === 1 }

  setOutput(g: number, level: number): void {
    Atomics.store(this.a, OUTPUT + g, Math.round(Math.min(1, Math.max(0, level)) * OUT_SCALE))
  }
  getOutput(g: number): number { return Atomics.load(this.a, OUTPUT + g) / OUT_SCALE }

  setAdcRaw(c: number, raw: number): void {
    Atomics.store(this.a, ADC + c, Math.min(1023, Math.max(0, Math.round(raw))))
  }
  getAdcRaw(c: number): number { return Atomics.load(this.a, ADC + c) }

  resetOutputs(): void { this.a.fill(0, OUTPUT, OUTPUT + GPIO_COUNT) }
  resetButtons(): void { this.a.fill(0, BUTTON, BUTTON + GPIO_COUNT) }

  /** Slaapt de aanroepende thread; alleen in de worker gebruiken. */
  sleep(seconds: number): void {
    if (seconds <= 0) return
    if (this.buffer instanceof SharedArrayBuffer) {
      Atomics.wait(this.a, SLEEP, 0, seconds * 1000)
    } else {
      const end = performance.now() + seconds * 1000
      while (performance.now() < end) { /* busy wait */ }
    }
  }
}

export interface PinWarning {
  pin: string
  device: string
  found?: string
}

export interface HardwareBridge {
  now(): number
  sleep(seconds: number): void
  partKindAtGpio(g: number): PartKind | null
  partKindAtChannel(c: number): PartKind | null
  readButton(g: number): boolean
  writeOutput(g: number, level: number): void
  readAdc(c: number): number
  warn(code: 'pin-unconnected' | 'pin-wrong-kind', info: PinWarning): void
}

export function bridgeFromState(state: HardwareState, warn: HardwareBridge['warn']): HardwareBridge {
  return {
    now: () => performance.now() / 1000,
    sleep: (s) => state.sleep(s),
    partKindAtGpio: (g) => state.partKindAtGpio(g),
    partKindAtChannel: (c) => state.partKindAtChannel(c),
    readButton: (g) => state.isButtonPressed(g),
    writeOutput: (g, level) => state.setOutput(g, level),
    readAdc: (c) => state.getAdcRaw(c),
    warn,
  }
}
