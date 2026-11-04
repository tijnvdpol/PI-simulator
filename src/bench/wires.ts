import { SPI_PINS, nearestGnd, pinByPhysical } from '../pinout/pinout'
import type { Part } from '../project/types'

export const WIRE_COLORS = ['red', 'black', 'blue', 'green', 'yellow', 'orange', 'purple'] as const
export type WireColor = (typeof WIRE_COLORS)[number]

export interface Wire {
  id: string
  from: { part: string } | { chip: 'mcp3008' }
  to: { physical: number } | { chip: 'mcp3008'; channel: number }
  kind: 'power' | 'ground' | 'signal'
  color: WireColor
  /** Naam van de chip-aansluiting (MOSI, MISO, SCLK, CE0, VDD, GND) bij draden van de MCP3008. */
  label?: string
}

const SIGNAL_COLORS: WireColor[] = ['blue', 'green', 'yellow', 'orange', 'purple']

const isAnalog = (p: Part) => p.kind === 'temperature' || p.kind === 'potentiometer'

/** Draden zijn een zuivere functie van de onderdelen; fase 3 kan hier losse draden naast zetten. */
export function computeWires(parts: Part[]): Wire[] {
  const wires: Wire[] = []
  let signalIndex = 0
  let chip = false
  for (const part of parts) {
    const c = part.connection
    if (!c) continue
    const color = SIGNAL_COLORS[signalIndex++ % SIGNAL_COLORS.length]
    if (c.type === 'adc') {
      if (!isAnalog(part)) continue
      chip = true
      wires.push({ id: `${part.id}:signal`, from: { part: part.id }, to: { chip: 'mcp3008', channel: c.channel }, kind: 'signal', color })
      continue
    }
    const pin = pinByPhysical(c.physical)
    if (pin.kind === 'gpio') {
      wires.push({ id: `${part.id}:signal`, from: { part: part.id }, to: { physical: c.physical }, kind: 'signal', color })
    } else {
      const kind = pin.kind === 'gnd' ? 'ground' : 'power'
      wires.push({ id: `${part.id}:signal`, from: { part: part.id }, to: { physical: c.physical }, kind, color: pin.kind === 'gnd' ? 'black' : 'red' })
    }
    if (pin.kind !== 'gnd') {
      wires.push({ id: `${part.id}:gnd`, from: { part: part.id }, to: { physical: nearestGnd(c.physical) }, kind: 'ground', color: 'black' })
    }
  }
  if (chip) {
    const chipWire = (label: string, physical: number, kind: Wire['kind'], color: WireColor): Wire => ({
      id: `chip:${label}`, from: { chip: 'mcp3008' }, to: { physical }, kind, color, label,
    })
    wires.push(
      chipWire('VDD', 1, 'power', 'red'),
      chipWire('GND', nearestGnd(SPI_PINS.sclk), 'ground', 'black'),
      chipWire('MOSI', SPI_PINS.mosi, 'signal', 'purple'),
      chipWire('MISO', SPI_PINS.miso, 'signal', 'green'),
      chipWire('SCLK', SPI_PINS.sclk, 'signal', 'yellow'),
      chipWire('CE0', SPI_PINS.ce0, 'signal', 'orange'),
    )
  }
  return wires
}
