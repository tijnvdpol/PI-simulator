/**
 * Het breadboard: een halve maat (30 kolommen). Aansluitpunten ("terminals") hebben een tekst-id:
 *   pin:11        pin 11 van de Pi (fysiek nummer)
 *   h:e12         gaatje rij e, kolom 12 (rijen a..j, kolommen 1..30)
 *   r:t+:7        railgaatje: bovenste plus-rail, gat 7 (r:t-, r:b+, r:b-)
 *   adc:0         kanaal 0 van de ingebouwde MCP3008-module
 */
export const COLS = 30
export const ROWS = 10
export const ROW_LETTERS = 'abcdefghij'
export const RAIL_LEN = 25
export const RAILS = ['t+', 't-', 'b+', 'b-'] as const
export type RailName = (typeof RAILS)[number]

export const holeId = (col: number, row: number): string => `h:${ROW_LETTERS[row]}${col}`
export const railId = (rail: RailName, index: number): string => `r:${rail}:${index}`
export const pinId = (physical: number): string => `pin:${physical}`
export const adcId = (channel: number): string => `adc:${channel}`

export type Terminal =
  | { type: 'pin'; physical: number }
  | { type: 'hole'; col: number; row: number }
  | { type: 'rail'; rail: RailName; index: number }
  | { type: 'adc'; channel: number }

export function parseTerminal(id: string): Terminal | null {
  let m = /^pin:(\d+)$/.exec(id)
  if (m) { const n = Number(m[1]); return n >= 1 && n <= 40 ? { type: 'pin', physical: n } : null }
  m = /^h:([a-j])(\d+)$/.exec(id)
  if (m) { const col = Number(m[2]); return col >= 1 && col <= COLS ? { type: 'hole', col, row: ROW_LETTERS.indexOf(m[1]) } : null }
  m = /^r:(t\+|t-|b\+|b-):(\d+)$/.exec(id)
  if (m) { const index = Number(m[2]); return index >= 1 && index <= RAIL_LEN ? { type: 'rail', rail: m[1] as RailName, index } : null }
  m = /^adc:(\d)$/.exec(id)
  if (m) { const c = Number(m[1]); return c <= 7 ? { type: 'adc', channel: c } : null }
  return null
}

/**
 * Het interne net van een gaatje: een rij van 5 (a–e of f–j) in één kolom, of een hele rail.
 * Pinnen en adc-kanalen zijn geen breadboard en hebben geen intern net.
 */
export function internalNet(id: string): string | null {
  const t = parseTerminal(id)
  if (!t) return null
  if (t.type === 'hole') return `bb:c${t.col}:${t.row < 5 ? 'top' : 'bot'}`
  if (t.type === 'rail') return `bb:rail:${t.rail}`
  return null
}

/** Alle gaatjes (en railgaatjes) die intern met dit gaatje verbonden zijn, het gaatje zelf inbegrepen. */
export function internalGroup(id: string): string[] {
  const t = parseTerminal(id)
  if (!t) return []
  if (t.type === 'hole') {
    const rows = t.row < 5 ? [0, 1, 2, 3, 4] : [5, 6, 7, 8, 9]
    return rows.map((r) => holeId(t.col, r))
  }
  if (t.type === 'rail') return Array.from({ length: RAIL_LEN }, (_, i) => railId(t.rail, i + 1))
  return []
}

export function allHoles(): string[] {
  const out: string[] = []
  for (let col = 1; col <= COLS; col++) for (let row = 0; row < ROWS; row++) out.push(holeId(col, row))
  return out
}

export function allRailHoles(): string[] {
  return RAILS.flatMap((r) => Array.from({ length: RAIL_LEN }, (_, i) => railId(r, i + 1)))
}
