import { PINS, pinByPhysical } from '../pinout/pinout'
import type { Connection, LedColor, Part, PartKind } from '../project/types'

export interface BenchState { parts: Part[]; connecting: string | null; error: string | null }

export type BenchAction =
  | { type: 'add'; kind: PartKind; x: number; y: number }
  | { type: 'move'; id: string; x: number; y: number }
  | { type: 'remove'; id: string }
  | { type: 'beginConnect'; id: string }
  | { type: 'cancelConnect' }
  | { type: 'connect'; id: string; target: Connection }
  | { type: 'setColor'; id: string; color: LedColor }
  | { type: 'load'; parts: Part[] }

export const PART_NAMES_NL: Record<PartKind, string> = {
  led: 'led', button: 'knop', buzzer: 'buzzer', temperature: 'temperatuursensor', potentiometer: 'potmeter',
}
const WITH_ARTICLE: Record<PartKind, string> = {
  led: 'de led', button: 'de knop', buzzer: 'de buzzer', temperature: 'de temperatuursensor', potentiometer: 'de potmeter',
}

export const isAnalog = (k: PartKind) => k === 'temperature' || k === 'potentiometer'

export const initialBench: BenchState = { parts: [], connecting: null, error: null }

function nextId(parts: Part[]): string {
  const max = parts.reduce((m, p) => Math.max(m, Number(/^part-(\d+)$/.exec(p.id)?.[1] ?? 0)), 0)
  return `part-${max + 1}`
}

/** Welke andere onderdelen zitten er al op dit doel? Voedings-/GND-pinnen mogen gedeeld worden. */
function occupant(parts: Part[], exceptId: string, target: Connection): Part | undefined {
  if (target.type === 'pin' && pinByPhysical(target.physical).kind !== 'gpio') return undefined
  return parts.find((p) => {
    if (p.id === exceptId || !p.connection) return false
    return target.type === 'pin'
      ? p.connection.type === 'pin' && p.connection.physical === target.physical
      : p.connection.type === 'adc' && p.connection.channel === target.channel
  })
}

function validTarget(kind: PartKind, t: Connection): boolean {
  if (t.type === 'adc') return isAnalog(kind) && Number.isInteger(t.channel) && t.channel >= 0 && t.channel <= 7
  return !isAnalog(kind) && Number.isInteger(t.physical) && t.physical >= 1 && t.physical <= 40 && pinByPhysical(t.physical).kind !== 'id'
}

export function benchReducer(s: BenchState, a: BenchAction): BenchState {
  const update = (id: string, f: (p: Part) => Part) => s.parts.map((p) => (p.id === id ? f(p) : p))
  switch (a.type) {
    case 'add': {
      const part: Part = { id: nextId(s.parts), kind: a.kind, x: a.x, y: a.y, connection: null }
      if (a.kind === 'led') part.color = 'red'
      return { ...s, parts: [...s.parts, part], error: null }
    }
    case 'move': return { ...s, parts: update(a.id, (p) => ({ ...p, x: a.x, y: a.y })) }
    case 'remove': return { ...s, parts: s.parts.filter((p) => p.id !== a.id), connecting: s.connecting === a.id ? null : s.connecting, error: null }
    case 'beginConnect': return s.parts.some((p) => p.id === a.id) ? { ...s, connecting: a.id, error: null } : s
    case 'cancelConnect': return { ...s, connecting: null, error: null }
    case 'setColor': return { ...s, parts: update(a.id, (p) => ({ ...p, color: a.color })) }
    case 'load': return { parts: a.parts, connecting: null, error: null }
    case 'connect': {
      const part = s.parts.find((p) => p.id === a.id)
      if (!part || !validTarget(part.kind, a.target)) return s
      const other = occupant(s.parts, a.id, a.target)
      if (other) {
        const where = a.target.type === 'pin' ? `Pin ${a.target.physical} (GPIO ${pinByPhysical(a.target.physical).gpio})` : `Kanaal CH${a.target.channel}`
        return { ...s, error: `${where} is al in gebruik door ${WITH_ARTICLE[other.kind]}. Kies een andere plek.` }
      }
      return { ...s, parts: update(a.id, (p) => ({ ...p, connection: a.target })), connecting: null, error: null }
    }
  }
}

export function selectableTargets(s: BenchState, id: string): { pins: number[]; channels: number[] } {
  const part = s.parts.find((p) => p.id === id)
  if (!part) return { pins: [], channels: [] }
  if (isAnalog(part.kind)) {
    const channels = [0, 1, 2, 3, 4, 5, 6, 7].filter((c) => !occupant(s.parts, id, { type: 'adc', channel: c }))
    return { pins: [], channels }
  }
  const pins = PINS.filter((p) => p.kind !== 'id' && !occupant(s.parts, id, { type: 'pin', physical: p.physical })).map((p) => p.physical)
  return { pins, channels: [] }
}
