import { PINS, pinByPhysical } from '../pinout/pinout'
import type { Connection, LedColor, Part, PartKind } from '../project/types'
import { PART_NAMES_NL, WITH_ARTICLE } from './names'
import { pinFit, suggestPin, terminalsOf, type TerminalSpec } from './terminals'

export interface BenchState { parts: Part[]; connecting: string | null; error: string | null }

export type BenchAction =
  | { type: 'add'; kind: PartKind; x: number; y: number }
  | { type: 'move'; id: string; x: number; y: number }
  | { type: 'remove'; id: string }
  | { type: 'beginConnect'; id: string }
  | { type: 'cancelConnect' }
  /** `terminal` ontbreekt = de eerste aansluiting van het onderdeel (bij de oude onderdelen is dat de enige). */
  | { type: 'connect'; id: string; target: Connection; terminal?: string }
  | { type: 'disconnect'; id: string; terminal: string }
  /** Sluit alle lege aansluitingen aan op de voorgestelde pinnen. */
  | { type: 'autoConnect'; id: string }
  | { type: 'setColor'; id: string; color: LedColor }
  | { type: 'load'; parts: Part[] }

export { PART_NAMES_NL }

/** Onderdelen die op een kanaal van de MCP3008 zitten. */
export const isAnalog = (k: PartKind) => k === 'temperature' || k === 'potentiometer'

/** Soorten waar je een kleur voor kiest. */
export const hasColor = (k: PartKind) => k === 'led' || k === 'pwmled'

export const initialBench: BenchState = { parts: [], connecting: null, error: null }

function nextId(parts: Part[]): string {
  const max = parts.reduce((m, p) => Math.max(m, Number(/^part-(\d+)$/.exec(p.id)?.[1] ?? 0)), 0)
  return `part-${max + 1}`
}

const sameTarget = (c: Connection, t: Connection) =>
  t.type === 'pin' ? c.type === 'pin' && c.physical === t.physical : c.type === 'adc' && c.channel === t.channel

/** Welk ander onderdeel (of andere terminal) zit er al op dit doel? Voedings-/GND-pinnen mogen gedeeld worden. */
function occupant(parts: Part[], exceptId: string, exceptTerminal: string, target: Connection): Part | undefined {
  if (target.type === 'pin' && pinByPhysical(target.physical).kind !== 'gpio') return undefined
  return parts.find((p) => Object.entries(p.connections).some(([tid, c]) => !(p.id === exceptId && tid === exceptTerminal) && sameTarget(c, target)))
}

function validTarget(spec: TerminalSpec, t: Connection): boolean {
  if (t.type === 'adc') return spec.type === 'adc' && Number.isInteger(t.channel) && t.channel >= 0 && t.channel <= 7
  return spec.type !== 'adc' && Number.isInteger(t.physical) && t.physical >= 1 && t.physical <= 40 && pinByPhysical(t.physical).kind !== 'id'
}

const gpioPinsInUse = (parts: Part[]): Set<number> => {
  const used = new Set<number>()
  for (const p of parts) for (const c of Object.values(p.connections)) if (c.type === 'pin' && pinByPhysical(c.physical).kind === 'gpio') used.add(c.physical)
  return used
}

export function benchReducer(s: BenchState, a: BenchAction): BenchState {
  const update = (id: string, f: (p: Part) => Part) => s.parts.map((p) => (p.id === id ? f(p) : p))
  switch (a.type) {
    case 'add': {
      const part: Part = { id: nextId(s.parts), kind: a.kind, x: a.x, y: a.y, connections: {} }
      if (hasColor(a.kind)) part.color = 'red'
      return { ...s, parts: [...s.parts, part], error: null }
    }
    case 'move': return { ...s, parts: update(a.id, (p) => ({ ...p, x: a.x, y: a.y })) }
    case 'remove': return { ...s, parts: s.parts.filter((p) => p.id !== a.id), connecting: s.connecting === a.id ? null : s.connecting, error: null }
    case 'beginConnect': return s.parts.some((p) => p.id === a.id) ? { ...s, connecting: a.id, error: null } : s
    case 'cancelConnect': return { ...s, connecting: null, error: null }
    case 'setColor': return { ...s, parts: update(a.id, (p) => ({ ...p, color: a.color })) }
    case 'load': return { parts: a.parts, connecting: null, error: null }
    case 'disconnect': {
      return { ...s, parts: update(a.id, (p) => {
        const { [a.terminal]: _gone, ...rest } = p.connections
        return { ...p, connections: rest }
      }), error: null }
    }
    case 'autoConnect': {
      const part = s.parts.find((p) => p.id === a.id)
      if (!part) return s
      const taken = gpioPinsInUse(s.parts)
      const connections = { ...part.connections }
      for (const spec of terminalsOf(part.kind)) {
        if (connections[spec.id]) continue
        const pin = suggestPin(spec, taken)
        if (pin === null) continue
        connections[spec.id] = { type: 'pin', physical: pin }
        taken.add(pin)
      }
      return { ...s, parts: update(a.id, (p) => ({ ...p, connections })), error: null }
    }
    case 'connect': {
      const part = s.parts.find((p) => p.id === a.id)
      if (!part) return s
      const spec = terminalsOf(part.kind).find((t) => t.id === (a.terminal ?? terminalsOf(part.kind)[0].id))
      if (!spec || !validTarget(spec, a.target)) return s
      if (a.target.type === 'pin') {
        const fit = pinFit(spec, a.target.physical)
        if (!fit.ok) return { ...s, error: fit.reason ?? 'Deze pin past hier niet.' }
      }
      const other = occupant(s.parts, a.id, spec.id, a.target)
      if (other) {
        const where = a.target.type === 'pin' ? `Pin ${a.target.physical} (GPIO ${pinByPhysical(a.target.physical).gpio})` : `Kanaal CH${a.target.channel}`
        const who = other.id === part.id ? `een andere aansluiting van ${WITH_ARTICLE[other.kind]}` : WITH_ARTICLE[other.kind]
        return { ...s, error: `${where} is al in gebruik door ${who}. Kies een andere plek.` }
      }
      // Het pinmenu blijft open tot alle aansluitingen van het onderdeel een plek hebben.
      const complete = terminalsOf(part.kind).every((t) => t.id === spec.id || part.connections[t.id])
      return { ...s, parts: update(a.id, (p) => ({ ...p, connections: { ...p.connections, [spec.id]: a.target } })), connecting: complete ? null : s.connecting, error: null }
    }
  }
}

export interface Targets {
  pins: number[]
  channels: number[]
  /** Voorgestelde pinnen (subset van `pins`, in volgorde van voorkeur). */
  suggested: number[]
  /** Per pin die niet te kiezen is: waarom niet. */
  reasons: Record<number, string>
}

export function selectableTargets(s: BenchState, id: string, terminal?: string): Targets {
  const none: Targets = { pins: [], channels: [], suggested: [], reasons: {} }
  const part = s.parts.find((p) => p.id === id)
  if (!part) return none
  const spec = terminalsOf(part.kind).find((t) => t.id === (terminal ?? terminalsOf(part.kind)[0].id))
  if (!spec) return none
  if (spec.type === 'adc') {
    const channels = [0, 1, 2, 3, 4, 5, 6, 7].filter((c) => !occupant(s.parts, id, spec.id, { type: 'adc', channel: c }))
    return { ...none, channels }
  }
  const pins: number[] = []
  const reasons: Record<number, string> = {}
  for (const p of PINS) {
    const fit = pinFit(spec, p.physical)
    if (!fit.ok) { reasons[p.physical] = fit.reason ?? ''; continue }
    if (occupant(s.parts, id, spec.id, { type: 'pin', physical: p.physical })) { reasons[p.physical] = 'Al in gebruik door een ander onderdeel'; continue }
    pins.push(p.physical)
  }
  const suggested = (spec.suggest ?? []).filter((p) => pins.includes(p))
  return { pins, channels: [], suggested, reasons }
}

