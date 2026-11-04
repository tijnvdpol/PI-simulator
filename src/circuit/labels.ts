import { pinByPhysical } from '../pinout/pinout'
import { ROW_LETTERS, parseTerminal } from './breadboard'

const RAIL_NAMES = { 't+': 'plus-rail boven', 't-': 'min-rail boven', 'b+': 'plus-rail onder', 'b-': 'min-rail onder' } as const

/** Korte Nederlandse naam van een aansluitpunt, voor tooltips en meldingen. */
export function describeTerminal(id: string): string {
  const t = parseTerminal(id)
  if (!t) return id
  switch (t.type) {
    case 'pin': { const p = pinByPhysical(t.physical); return `Pin ${p.physical} · ${p.naam}` }
    case 'hole': return `Rij ${ROW_LETTERS[t.row]} · kolom ${t.col}`
    case 'rail': return `${RAIL_NAMES[t.rail][0].toUpperCase()}${RAIL_NAMES[t.rail].slice(1)}`
    case 'adc': return `MCP3008 · kanaal CH${t.channel}`
  }
}

/** Uitleg bij een gaatje: hoe het intern verbonden is. */
export function explainTerminal(id: string): string | null {
  const t = parseTerminal(id)
  if (!t) return null
  if (t.type === 'hole') return t.row < 5 ? `Verbonden met de andere gaatjes a–e in kolom ${t.col}` : `Verbonden met de andere gaatjes f–j in kolom ${t.col}`
  if (t.type === 'rail') return t.rail.endsWith('+') ? 'De hele rail is verbonden (stroom, +)' : 'De hele rail is verbonden (min, −)'
  return null
}
