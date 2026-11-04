import { celsiusToRaw, positionToRaw } from '../bench/liveControls'
import { ADC_CHANNELS, GPIO_COUNT, type HardwareState } from '../engine/hardwareState'
import { pinByGpio } from '../pinout/pinout'
import type { Part, PartKind } from '../project/types'
import type { AnalysisResult, AnalyzeInputs, GpioMode } from './analyze'
import type { Circuit } from './types'

/** Wat de Python-code nu met de pinnen doet (uit het gedeelde geheugen), plus de bediening op de werkbank. */
export function inputsFromHardware(
  hw: HardwareState,
  extra: { pressed?: Record<string, boolean>; sensors?: Record<string, number>; burnt?: ReadonlySet<string> } = {},
): AnalyzeInputs {
  const gpio: Record<number, GpioMode> = {}
  for (let g = 0; g < GPIO_COUNT; g++) {
    const mode = hw.getMode(g)
    if (mode === 'out') gpio[g] = { mode: 'out', level: hw.getOutput(g) }
    else if (mode) gpio[g] = { mode: 'in', pull: mode }
  }
  return { gpio, ...extra }
}

/** De onderdelen zoals Python ze ziet: elk digitaal onderdeel op "zijn" GPIO, elke sensor op zijn kanaal. */
export function effectiveParts(result: AnalysisResult): Part[] {
  const out: Part[] = []
  for (const [g, a] of Object.entries(result.attached)) {
    const pin = pinByGpio(Number(g))
    if (pin) out.push({ id: a.partId, kind: a.kind as PartKind, x: 0, y: 0, connection: { type: 'pin', physical: pin.physical } })
  }
  for (const [ch, a] of Object.entries(result.analog)) {
    out.push({ id: a.partId, kind: a.kind, x: 0, y: 0, connection: { type: 'adc', channel: Number(ch) } })
  }
  return out
}

/** Zet de uitkomst van de analyse in het gedeelde geheugen: knopstanden en sensorwaarden voor Python. */
export function syncHardware(hw: HardwareState, result: AnalysisResult, inputs: AnalyzeInputs): void {
  for (let g = 0; g < GPIO_COUNT; g++) {
    const a = result.attached[g]
    const mode = inputs.gpio?.[g]
    let pressed = false
    if (a?.kind === 'button' && mode?.mode === 'in' && g in result.gpioLevel) {
      // gpiozero: met pull-up is "ingedrukt" een laag niveau, met pull-down een hoog niveau.
      pressed = result.gpioLevel[g] !== (mode.pull === 'up')
    }
    hw.setButtonPressed(g, pressed)
  }
  const raw = new Array<number>(ADC_CHANNELS).fill(0)
  for (const [ch, a] of Object.entries(result.analog)) {
    if (a.powered) raw[Number(ch)] = a.kind === 'temperature' ? celsiusToRaw(a.value) : positionToRaw(a.value)
  }
  raw.forEach((r, c) => hw.setAdcRaw(c, r))
}

export const circuitIsEmpty = (c: Circuit) => c.parts.length === 0 && c.wires.length === 0
