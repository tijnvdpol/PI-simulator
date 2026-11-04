import { ADC_CHANNELS, type HardwareState } from '../engine/hardwareState'
import { pinByPhysical } from '../pinout/pinout'
import type { Part, PartKind } from '../project/types'
import type { PartLive } from './benchTypes'

export const TEMP_MIN = -10
export const TEMP_MAX = 50

/** Temperatuurschuifje (°C) → ADC-waarde, voor een TMP36-achtige sensor: 0,5 V + 10 mV per °C, referentie 3,3 V. */
export const celsiusToRaw = (c: number) => Math.min(1023, Math.max(0, Math.round(((c / 100 + 0.5) / 3.3) * 1023)))
export const positionToRaw = (p: number) => Math.min(1023, Math.max(0, Math.round(p * 1023)))

export const defaultSensorValue = (kind: PartKind): number => (kind === 'temperature' ? 20 : 0.5)

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

const gpioOf = (p: Part): number | null => { const c = p.connections.signal; return c?.type === 'pin' ? pinByPhysical(c.physical).gpio : null }

/** Wat de werkbank nu moet tonen, gelezen uit het gedeelde geheugen. */
export function snapshot(state: HardwareState, parts: Part[], values: Record<string, number>): Record<string, PartLive> {
  const out: Record<string, PartLive> = {}
  for (const p of parts) {
    const g = gpioOf(p)
    switch (p.kind) {
      case 'led':
      case 'buzzer': out[p.id] = { level: g === null ? 0 : state.getOutput(g) }; break
      case 'button': out[p.id] = { pressed: g === null ? false : state.isButtonPressed(g) }; break
      case 'temperature': out[p.id] = { celsius: values[p.id] ?? defaultSensorValue('temperature') }; break
      case 'potentiometer': out[p.id] = { position: values[p.id] ?? defaultSensorValue('potentiometer') }; break
    }
  }
  return out
}
