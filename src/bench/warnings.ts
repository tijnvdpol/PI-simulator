import { explainPowerPin } from '../engine/explainError'
import { pinByPhysical } from '../pinout/pinout'
import type { Part } from '../project/types'

export interface BenchWarning { partId: string; physical: number; message: string }

/** Onderdelen op een 5V-, 3V3- of GND-pin krijgen een waarschuwing met uitleg. */
export function benchWarnings(parts: Part[]): BenchWarning[] {
  const out: BenchWarning[] = []
  for (const part of parts) {
    const c = part.connections.signal
    if (!c || c.type !== 'pin') continue
    const pin = pinByPhysical(c.physical)
    if (pin.kind === '5v' || pin.kind === '3v3' || pin.kind === 'gnd') {
      out.push({ partId: part.id, physical: c.physical, message: explainPowerPin(part, pin) })
    }
  }
  return out
}
