import { pinByPhysical } from '../pinout/pinout'
import { isComplete } from '../bench/partStatus'
import { terminalsOf } from '../bench/terminals'
import { PART_KINDS, type Part, type PartKind } from '../project/types'

export const GPIO_COUNT = 28
export const ADC_CHANNELS = 8

// Indeling van de Int32Array over de buffer.
const KIND_GPIO = 0
const KIND_CH = KIND_GPIO + GPIO_COUNT
const BUTTON = KIND_CH + ADC_CHANNELS
const OUTPUT = BUTTON + GPIO_COUNT
const ADC = OUTPUT + GPIO_COUNT
const DIST = ADC + ADC_CHANNELS          // afstand in 0,1 cm per echo-pin (0 = geen echo)
const SERVO = DIST + GPIO_COUNT          // 0 = ontkoppeld, anders stand*1000 + 1
const I2C = SERVO + GPIO_COUNT           // 1 als er een bereikbaar OLED-scherm op adres 0x3C zit
const DISPLAY_VERSION = I2C + 1
const DISPLAY_ON = DISPLAY_VERSION + 1
const CONTRAST = DISPLAY_ON + 1
const DISPLAY = CONTRAST + 1             // 128 × 64 pixels, 1 bit per pixel: 256 woorden
export const DISPLAY_BYTES = 128 * 64 / 8
const DISPLAY_WORDS = DISPLAY_BYTES / 4
const SLEEP = DISPLAY + DISPLAY_WORDS
const TOTAL = SLEEP + 1

export const OLED_ADDRESS = 0x3c

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
    Atomics.store(this.a, I2C, 0)
    for (const p of parts) {
      for (const spec of terminalsOf(p.kind)) {
        const c = p.connections[spec.id]
        if (!c) continue
        if (c.type === 'adc') {
          Atomics.store(this.a, KIND_CH + c.channel, kindCode(p.kind))
        } else if (spec.type === 'gpio') {
          const g = pinByPhysical(c.physical).gpio
          if (g !== null) Atomics.store(this.a, KIND_GPIO + g, kindCode(p.kind))
        }
      }
      if (p.kind === 'oled' && isComplete(p)) Atomics.store(this.a, I2C, 1)
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

  setDistanceCm(g: number, cm: number): void { Atomics.store(this.a, DIST + g, Math.max(0, Math.round(cm * 10))) }
  getDistanceCm(g: number): number { return Atomics.load(this.a, DIST + g) / 10 }

  /** Servo-stand 0..1 (0 = helemaal links), of null voor "ontkoppeld". */
  setServo(g: number, position: number | null): void {
    Atomics.store(this.a, SERVO + g, position === null ? 0 : Math.round(Math.min(1, Math.max(0, position)) * OUT_SCALE) + 1)
  }
  getServo(g: number): number | null {
    const v = Atomics.load(this.a, SERVO + g)
    return v === 0 ? null : (v - 1) / OUT_SCALE
  }

  i2cPresent(address: number): boolean { return address === OLED_ADDRESS && Atomics.load(this.a, I2C) === 1 }

  displayVersion(): number { return Atomics.load(this.a, DISPLAY_VERSION) }
  /** Zet het beeld (1024 bytes, rij voor rij, 1 bit per pixel, hoogste bit links). Andere lengtes worden genegeerd. */
  setDisplay(bytes: Uint8Array): void {
    if (bytes.length !== DISPLAY_BYTES) return
    for (let w = 0; w < DISPLAY_WORDS; w++) {
      const i = w * 4
      Atomics.store(this.a, DISPLAY + w, bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16) | (bytes[i + 3] << 24))
    }
    Atomics.add(this.a, DISPLAY_VERSION, 1)
  }
  getDisplay(): Uint8Array {
    const out = new Uint8Array(DISPLAY_BYTES)
    for (let w = 0; w < DISPLAY_WORDS; w++) {
      const v = Atomics.load(this.a, DISPLAY + w)
      out[w * 4] = v & 255; out[w * 4 + 1] = (v >> 8) & 255; out[w * 4 + 2] = (v >> 16) & 255; out[w * 4 + 3] = (v >>> 24) & 255
    }
    return out
  }
  resetDisplay(): void {
    this.a.fill(0, DISPLAY, DISPLAY + DISPLAY_WORDS)
    Atomics.store(this.a, DISPLAY_ON, 1)
    Atomics.store(this.a, CONTRAST, 255)
    Atomics.add(this.a, DISPLAY_VERSION, 1)
  }
  /** Staat standaard aan; de opslag is omgekeerd zodat een lege buffer "aan" betekent. */
  displayOn(): boolean { return Atomics.load(this.a, DISPLAY_ON) !== 2 }
  setDisplayOn(on: boolean): void { Atomics.store(this.a, DISPLAY_ON, on ? 1 : 2); Atomics.add(this.a, DISPLAY_VERSION, 1) }
  contrast(): number { return Atomics.load(this.a, CONTRAST) }
  setContrast(level: number): void { Atomics.store(this.a, CONTRAST, Math.min(255, Math.max(0, Math.round(level)))); Atomics.add(this.a, DISPLAY_VERSION, 1) }

  resetOutputs(): void { this.a.fill(0, OUTPUT, OUTPUT + GPIO_COUNT); this.a.fill(0, SERVO, SERVO + GPIO_COUNT) }
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
  readDistance(g: number): number
  writeServo(g: number, position: number | null): void
  i2cPresent(address: number): boolean
  writeDisplay(bytes: Uint8Array): void
  setDisplayOn(on: boolean): void
  setContrast(level: number): void
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
    readDistance: (g) => state.getDistanceCm(g),
    writeServo: (g, p) => state.setServo(g, p),
    i2cPresent: (a) => state.i2cPresent(a),
    writeDisplay: (b) => state.setDisplay(b),
    setDisplayOn: (on) => state.setDisplayOn(on),
    setContrast: (l) => state.setContrast(l),
    warn,
  }
}
