import { SPI_PINS, nearestGnd, pinByPhysical } from '../pinout/pinout'
import type { Part } from '../project/types'
import { terminalsOf } from './terminals'

export type WireColor = 'red' | 'black' | 'blue' | 'green' | 'yellow' | 'orange' | 'purple'

export interface Wire {
  id: string
  from: { part: string } | { chip: 'mcp3008' }
  to: { physical: number } | { chip: 'mcp3008'; channel: number }
  kind: 'power' | 'ground' | 'signal'
  color: WireColor
  /** Naam van de chip-aansluiting (MOSI, MISO, SCLK, CE0, VDD, GND) bij draden van de MCP3008. */
  label?: string
  /** Aansluiting van het onderdeel waar deze draad aan zit (alleen bij onderdelen met meerdere aansluitingen). */
  terminal?: string
}

const SIGNAL_COLORS: WireColor[] = ['blue', 'green', 'yellow', 'orange', 'purple']

const isAnalog = (p: Part) => p.kind === 'temperature' || p.kind === 'potentiometer'

/** Draden zijn een zuivere functie van de onderdelen; fase 3 kan hier losse draden naast zetten. */
export function computeWires(parts: Part[]): Wire[] {
  const wires: Wire[] = []
  let signalIndex = 0
  let chip = false
  for (const part of parts) {
    // Onderdelen met een eigen GND-aansluiting (en voeding) krijgen één draad per aansluiting.
    if (terminalsOf(part.kind).some((t) => t.type === 'gnd')) {
      for (const spec of terminalsOf(part.kind)) {
        const conn = part.connections[spec.id]
        if (!conn || conn.type !== 'pin') continue
        const base = { id: `${part.id}:${spec.id}`, from: { part: part.id }, to: { physical: conn.physical }, terminal: spec.id }
        if (spec.type === 'gpio') wires.push({ ...base, kind: 'signal', color: SIGNAL_COLORS[signalIndex++ % SIGNAL_COLORS.length] })
        else if (spec.type === 'gnd') wires.push({ ...base, kind: 'ground', color: 'black' })
        else wires.push({ ...base, kind: 'power', color: 'red' })
      }
      continue
    }
    const c = part.connections.signal
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
