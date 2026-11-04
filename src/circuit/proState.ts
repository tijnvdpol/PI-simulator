import type { WireColor } from '../bench/wires'
import { PINS } from '../pinout/pinout'
import type { LedColor } from '../project/types'
import { parseTerminal } from './breadboard'
import { canPlace } from './parts'
import type { Circuit, ProKind, ProPart, ProWire, Rot } from './types'

const HISTORY_LIMIT = 100
const SIGNAL_COLORS: WireColor[] = ['blue', 'green', 'yellow', 'orange', 'purple']

export interface ProState {
  present: Circuit
  past: Circuit[]
  future: Circuit[]
  /** Eerste aansluitpunt van een draad die je aan het maken bent. */
  pending: string | null
  /** 'auto' kiest rood/zwart/signaalkleur op basis van de aansluitpunten. */
  wireColor: WireColor | 'auto'
  error: string | null
  /** Doorgebrande leds: hoort bij het draaien, niet bij het project en niet bij de geschiedenis. */
  burnt: string[]
}

export type ProAction =
  | { type: 'add'; kind: ProKind; col: number; row: number; rot: Rot }
  | { type: 'move'; id: string; col: number; row: number; rot: Rot }
  | { type: 'rotate'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'setResistance'; id: string; ohm: number }
  | { type: 'setColor'; id: string; color: LedColor }
  | { type: 'addWire'; a: string; b: string; color?: WireColor }
  | { type: 'removeWire'; id: string }
  | { type: 'recolorWire'; id: string; color: WireColor }
  | { type: 'clickTerminal'; terminal: string }
  | { type: 'cancelWire' }
  | { type: 'setWireColor'; color: WireColor | 'auto' }
  | { type: 'burn'; ids: string[] }
  | { type: 'replace'; id: string }
  | { type: 'clearError' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'load'; circuit: Circuit }

export const initialPro: ProState = {
  present: { parts: [], wires: [] }, past: [], future: [], pending: null, wireColor: 'auto', error: null, burnt: [],
}

const nextId = (prefix: string, ids: string[]) => {
  const max = ids.reduce((m, id) => Math.max(m, Number(new RegExp(`^${prefix}(\\d+)$`).exec(id)?.[1] ?? 0)), 0)
  return `${prefix}${max + 1}`
}

function autoColor(a: string, b: string, count: number): WireColor {
  const kinds = [a, b].map((id) => {
    const t = parseTerminal(id)
    if (t?.type === 'pin') { const k = PINS[t.physical - 1].kind; return k === 'gnd' ? 'gnd' : k === '3v3' || k === '5v' ? 'pwr' : 'sig' }
    if (t?.type === 'rail') return t.rail.endsWith('+') ? 'pwr' : 'gnd'
    return 'sig'
  })
  if (kinds.includes('pwr')) return 'red'
  if (kinds.includes('gnd')) return 'black'
  return SIGNAL_COLORS[count % SIGNAL_COLORS.length]
}

const commit = (s: ProState, next: Circuit, extra: Partial<ProState> = {}): ProState => ({
  ...s, ...extra, present: next, past: [...s.past, s.present].slice(-HISTORY_LIMIT), future: [], error: null,
})

const fail = (s: ProState, error: string): ProState => ({ ...s, error })

const withPart = (s: ProState, id: string, f: (p: ProPart) => ProPart): ProState => {
  if (!s.present.parts.some((p) => p.id === id)) return s
  return commit(s, { ...s.present, parts: s.present.parts.map((p) => (p.id === id ? f(p) : p)) })
}

export function proReducer(s: ProState, a: ProAction): ProState {
  switch (a.type) {
    case 'add': {
      const part: ProPart = { id: nextId('p', s.present.parts.map((p) => p.id)), kind: a.kind, col: a.col, row: a.row, rot: a.rot }
      if (a.kind === 'led') part.color = 'red'
      if (a.kind === 'resistor') part.resistance = 330
      if (!canPlace(part, s.present.parts)) return fail(s, 'Dat onderdeel past daar niet: de poten moeten in vrije gaatjes van het breadboard.')
      return commit(s, { ...s.present, parts: [...s.present.parts, part] })
    }
    case 'move': {
      const cur = s.present.parts.find((p) => p.id === a.id)
      if (!cur) return s
      const moved = { ...cur, col: a.col, row: a.row, rot: a.rot }
      if (cur.col === a.col && cur.row === a.row && cur.rot === a.rot) return s
      if (!canPlace(moved, s.present.parts)) return fail(s, 'Dat onderdeel past daar niet: de poten moeten in vrije gaatjes van het breadboard.')
      return withPart(s, a.id, () => moved)
    }
    case 'rotate': {
      const cur = s.present.parts.find((p) => p.id === a.id)
      if (!cur) return s
      const moved = { ...cur, rot: ((cur.rot + 1) % 4) as Rot }
      if (!canPlace(moved, s.present.parts)) return fail(s, 'Draaien past hier niet: de poten zouden buiten het bord of in een bezet gaatje komen.')
      return withPart(s, a.id, () => moved)
    }
    case 'remove': {
      if (!s.present.parts.some((p) => p.id === a.id)) return s
      return commit(s, { ...s.present, parts: s.present.parts.filter((p) => p.id !== a.id) }, { burnt: s.burnt.filter((id) => id !== a.id) })
    }
    case 'setResistance': return withPart(s, a.id, (p) => (p.kind === 'resistor' ? { ...p, resistance: a.ohm } : p))
    case 'setColor': return withPart(s, a.id, (p) => (p.kind === 'led' ? { ...p, color: a.color } : p))
    case 'addWire': {
      if (a.a === a.b || !parseTerminal(a.a) || !parseTerminal(a.b)) return { ...s, pending: null }
      if (s.present.wires.some((w) => (w.a === a.a && w.b === a.b) || (w.a === a.b && w.b === a.a))) return { ...s, pending: null }
      const color = a.color ?? (s.wireColor === 'auto' ? autoColor(a.a, a.b, s.present.wires.length) : s.wireColor)
      const wire: ProWire = { id: nextId('w', s.present.wires.map((w) => w.id)), a: a.a, b: a.b, color }
      return commit(s, { ...s.present, wires: [...s.present.wires, wire] }, { pending: null })
    }
    case 'removeWire': {
      if (!s.present.wires.some((w) => w.id === a.id)) return s
      return commit(s, { ...s.present, wires: s.present.wires.filter((w) => w.id !== a.id) })
    }
    case 'recolorWire': {
      if (!s.present.wires.some((w) => w.id === a.id)) return s
      return commit(s, { ...s.present, wires: s.present.wires.map((w) => (w.id === a.id ? { ...w, color: a.color } : w)) })
    }
    case 'clickTerminal': {
      if (s.pending === null) return parseTerminal(a.terminal) ? { ...s, pending: a.terminal, error: null } : s
      if (s.pending === a.terminal) return { ...s, pending: null }
      return proReducer(s, { type: 'addWire', a: s.pending, b: a.terminal })
    }
    case 'cancelWire': return { ...s, pending: null, error: null }
    case 'setWireColor': return { ...s, wireColor: a.color }
    case 'burn': return { ...s, burnt: [...new Set([...s.burnt, ...a.ids])] }
    case 'replace': return { ...s, burnt: s.burnt.filter((id) => id !== a.id) }
    case 'clearError': return s.error ? { ...s, error: null } : s
    case 'undo': {
      const prev = s.past[s.past.length - 1]
      if (!prev) return s
      return keepBurnt({ ...s, present: prev, past: s.past.slice(0, -1), future: [s.present, ...s.future], pending: null, error: null })
    }
    case 'redo': {
      const [next, ...rest] = s.future
      if (!next) return s
      return keepBurnt({ ...s, present: next, past: [...s.past, s.present], future: rest, pending: null, error: null })
    }
    case 'load': return { ...initialPro, wireColor: s.wireColor, present: a.circuit }
  }
}

/** Alleen onderdelen die nog bestaan kunnen doorgebrand zijn. */
const keepBurnt = (s: ProState): ProState => ({ ...s, burnt: s.burnt.filter((id) => s.present.parts.some((p) => p.id === id)) })
