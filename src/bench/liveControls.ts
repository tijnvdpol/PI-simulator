import { ADC_CHANNELS, GPIO_COUNT, type HardwareState } from '../engine/hardwareState'
import { pinByPhysical } from '../pinout/pinout'
import type { Part, PartKind } from '../project/types'
import type { PartLive } from './benchTypes'
import { isComplete } from './partStatus'
import { terminalsOf } from './terminals'

export const TEMP_MIN = -10
export const TEMP_MAX = 50

/** Temperatuurschuifje (°C) → ADC-waarde, voor een TMP36-achtige sensor: 0,5 V + 10 mV per °C, referentie 3,3 V. */
export const celsiusToRaw = (c: number) => Math.min(1023, Math.max(0, Math.round(((c / 100 + 0.5) / 3.3) * 1023)))
export const positionToRaw = (p: number) => Math.min(1023, Math.max(0, Math.round(p * 1023)))

/** Een schuifje op de werkbank. `scale`: hoeveel de schuif-invoer groter is dan de waarde (potmeter: 0–1 als 0–100). */
export interface SliderSpec {
  min: number
  max: number
  step: number
  initial: number
  scale: number
  label: string
  format: (v: number) => string
}

const SLIDERS: Partial<Record<PartKind, SliderSpec>> = {
  temperature: { min: TEMP_MIN, max: TEMP_MAX, step: 0.5, initial: 20, scale: 1, label: 'Temperatuur', format: (v) => `${v} °C` },
  potentiometer: { min: 0, max: 1, step: 0.01, initial: 0.5, scale: 100, label: 'Stand van de potmeter', format: (v) => `${Math.round(v * 100)}%` },
  distance: { min: 2, max: 400, step: 1, initial: 100, scale: 1, label: 'Afstand', format: (v) => `${v} cm` },
}

export const sliderFor = (kind: PartKind): SliderSpec | undefined => SLIDERS[kind]

export const defaultSensorValue = (kind: PartKind): number => SLIDERS[kind]?.initial ?? 0

const rawFor = (part: Part, value: number) => (part.kind === 'temperature' ? celsiusToRaw(value) : positionToRaw(value))

/** Zet de sensorwaarden van de werkbank in het gedeelde geheugen (kanalen zonder onderdeel gaan op 0). */
export function syncAnalog(state: HardwareState, parts: Part[], values: Record<string, number>): void {
  // Eerst de eindwaarden bepalen, dan elk kanaal één keer schrijven: een tussenstand 0 zou een lopend programma kunnen lezen.
  const target = new Array<number>(ADC_CHANNELS).fill(0)
  for (const p of parts) {
    const c = p.connections.signal
    if (c?.type !== 'adc') continue
    target[c.channel] = rawFor(p, values[p.id] ?? defaultSensorValue(p.kind))
  }
  target.forEach((raw, c) => state.setAdcRaw(c, raw))
}

const gpioAt = (p: Part, terminal: string): number | null => {
  const c = p.connections[terminal]
  return c?.type === 'pin' ? pinByPhysical(c.physical).gpio : null
}

/** Afstandssensoren: de schuifwaarde gaat naar de echo-pin. Zonder complete aansluiting (voeding!) komt er geen echo terug (0). */
export function syncDistance(state: HardwareState, parts: Part[], values: Record<string, number>): void {
  const target = new Array<number>(GPIO_COUNT).fill(0)
  for (const p of parts) {
    if (p.kind !== 'distance' || !isComplete(p)) continue
    const g = gpioAt(p, 'echo')
    if (g !== null) target[g] = values[p.id] ?? defaultSensorValue('distance')
  }
  target.forEach((cm, g) => state.setDistanceCm(g, cm))
}

/** Onderdelen met eigen voeding/GND doen pas mee als alles goed is aangesloten; zonder stroom blijven ze uit. */
const needsPower = (p: Part) => terminalsOf(p.kind).some((t) => t.type === 'gnd')

/** Wat de werkbank nu moet tonen, gelezen uit het gedeelde geheugen. */
export function snapshot(state: HardwareState, parts: Part[], values: Record<string, number>): Record<string, PartLive> {
  const out: Record<string, PartLive> = {}
  for (const p of parts) {
    const powered = !needsPower(p) || isComplete(p)
    const g = gpioAt(p, 'signal')
    switch (p.kind) {
      case 'led':
      case 'pwmled':
      case 'buzzer': out[p.id] = { level: g === null ? 0 : state.getOutput(g) }; break
      case 'button': out[p.id] = { pressed: g === null ? false : state.isButtonPressed(g) }; break
      case 'temperature': out[p.id] = { celsius: values[p.id] ?? defaultSensorValue('temperature') }; break
      case 'potentiometer': out[p.id] = { position: values[p.id] ?? defaultSensorValue('potentiometer') }; break
      case 'rgbled': {
        const level = (t: string) => { const x = gpioAt(p, t); return powered && x !== null ? state.getOutput(x) : 0 }
        out[p.id] = { rgb: [level('r'), level('g'), level('b')] }
        break
      }
      case 'servo': out[p.id] = { servo: powered && g !== null ? state.getServo(g) : null }; break
      case 'distance': out[p.id] = { distanceCm: values[p.id] ?? defaultSensorValue('distance') }; break
      case 'oled':
        out[p.id] = {
          display: { version: state.displayVersion(), on: powered && state.displayOn(), contrast: state.contrast() },
          readDisplay: () => state.getDisplay(),
        }
        break
    }
  }
  return out
}
