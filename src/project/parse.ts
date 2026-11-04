import { WIRE_COLORS, type WireColor } from '../bench/wires'
import { parseTerminal } from '../circuit/breadboard'
import { canPlace } from '../circuit/parts'
import { PRO_KINDS, type Circuit, type ProKind, type ProPart, type ProWire, type Rot } from '../circuit/types'
import { CURRENT_VERSION, LED_COLORS, PART_KINDS, type Connection, type LedColor, type Part, type PartKind, type Project, type ProjectMode, type Result } from './types'

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Migraties van oudere versies naar de huidige. Versie 1 had alleen de simpele modus. */
const migrations: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  1: (raw) => ({ ...raw, version: 2, mode: 'simple' }),
}

function parseConnection(raw: unknown): Result<Connection | null> {
  if (raw === null) return { ok: true, value: null }
  if (!isObj(raw)) return fail('Een onderdeel heeft een ongeldige verbinding.')
  if (raw.type === 'pin' && Number.isInteger(raw.physical) && (raw.physical as number) >= 1 && (raw.physical as number) <= 40) {
    return { ok: true, value: { type: 'pin', physical: raw.physical as number } }
  }
  if (raw.type === 'adc' && Number.isInteger(raw.channel) && (raw.channel as number) >= 0 && (raw.channel as number) <= 7) {
    return { ok: true, value: { type: 'adc', channel: raw.channel as number } }
  }
  return fail('Een onderdeel zit op een pin of kanaal dat niet bestaat.')
}

function parsePart(raw: unknown): Result<Part> {
  if (!isObj(raw)) return fail('Een onderdeel in het bestand is ongeldig.')
  if (typeof raw.id !== 'string') return fail('Een onderdeel mist een id.')
  if (!PART_KINDS.includes(raw.kind as PartKind)) return fail(`Onbekend onderdeel: ${String(raw.kind)}.`)
  if (typeof raw.x !== 'number' || typeof raw.y !== 'number') return fail('Een onderdeel mist een positie.')
  const conn = parseConnection(raw.connection === undefined ? null : raw.connection)
  if (!conn.ok) return conn
  const part: Part = { id: raw.id, kind: raw.kind as PartKind, x: raw.x, y: raw.y, connection: conn.value }
  if (raw.color !== undefined) {
    if (!LED_COLORS.includes(raw.color as LedColor)) return fail('Een led heeft een onbekende kleur.')
    part.color = raw.color as LedColor
  }
  return { ok: true, value: part }
}

const LED_OK = (c: unknown) => LED_COLORS.includes(c as LedColor)

function parseCircuit(raw: unknown): Result<Circuit> {
  if (raw === undefined) return { ok: true, value: { parts: [], wires: [] } }
  if (!isObj(raw) || !Array.isArray(raw.parts) || !Array.isArray(raw.wires)) return fail('De schakeling in dit project is ongeldig.')
  const ids = new Set<string>()
  const parts: ProPart[] = []
  for (const p of raw.parts) {
    if (!isObj(p) || typeof p.id !== 'string') return fail('Een onderdeel op het breadboard mist een id.')
    if (ids.has(p.id)) return fail('Twee onderdelen hebben hetzelfde id.')
    ids.add(p.id)
    if (!PRO_KINDS.includes(p.kind as ProKind)) return fail(`Onbekend onderdeel op het breadboard: ${String(p.kind)}.`)
    if (!Number.isInteger(p.col) || !Number.isInteger(p.row) || ![0, 1, 2, 3].includes(p.rot as number)) return fail('Een onderdeel op het breadboard heeft een ongeldige plek.')
    const part: ProPart = { id: p.id, kind: p.kind as ProKind, col: p.col as number, row: p.row as number, rot: p.rot as Rot }
    if (p.resistance !== undefined) {
      if (typeof p.resistance !== 'number' || !(p.resistance > 0)) return fail('Een weerstand heeft een ongeldige waarde.')
      part.resistance = p.resistance
    }
    if (p.color !== undefined) {
      if (!LED_OK(p.color)) return fail('Een led heeft een onbekende kleur.')
      part.color = p.color as LedColor
    }
    if (!canPlace(part, parts)) return fail('Een onderdeel past niet op het breadboard of zit in een bezet gaatje.')
    parts.push(part)
  }
  const wireIds = new Set<string>()
  const wires: ProWire[] = []
  for (const w of raw.wires) {
    if (!isObj(w) || typeof w.id !== 'string' || typeof w.a !== 'string' || typeof w.b !== 'string') return fail('Een draad in het project is ongeldig.')
    if (wireIds.has(w.id)) return fail('Twee draden hebben hetzelfde id.')
    wireIds.add(w.id)
    if (!parseTerminal(w.a) || !parseTerminal(w.b)) return fail('Een draad zit op een aansluitpunt dat niet bestaat.')
    if (!WIRE_COLORS.includes(w.color as WireColor)) return fail('Een draad heeft een onbekende kleur.')
    wires.push({ id: w.id, a: w.a, b: w.b, color: w.color as WireColor })
  }
  return { ok: true, value: { parts, wires } }
}

export function parseProject(input: unknown): Result<Project> {
  if (!isObj(input)) return fail('Dit is geen geldig projectbestand.')
  let raw = input
  if (typeof raw.version !== 'number') return fail('Dit bestand heeft geen versienummer en is geen geldig project.')
  if (raw.version > CURRENT_VERSION) {
    return fail('Dit project is gemaakt met een nieuwere versie van de Pi-simulator. Ververs de pagina of werk de app bij.')
  }
  while (raw.version !== CURRENT_VERSION) {
    const migrate = migrations[raw.version as number]
    if (!migrate) return fail('Deze versie van het projectbestand wordt niet meer ondersteund.')
    raw = migrate(raw)
  }
  if (typeof raw.code !== 'string') return fail('Het project bevat geen code.')
  if (!Array.isArray(raw.parts)) return fail('Het project bevat geen lijst met onderdelen.')
  const parts: Part[] = []
  for (const p of raw.parts) {
    const r = parsePart(p)
    if (!r.ok) return r
    parts.push(r.value)
  }
  const mode = raw.mode as ProjectMode
  if (mode !== 'simple' && mode !== 'pro') return fail('Dit project heeft een onbekende modus.')
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'Mijn project'
  if (mode === 'simple') return { ok: true, value: { version: CURRENT_VERSION, mode, name, parts, code: raw.code } }
  const circuit = parseCircuit(raw.pro)
  if (!circuit.ok) return circuit
  return { ok: true, value: { version: CURRENT_VERSION, mode, name, parts: [], pro: circuit.value, code: raw.code } }
}

export function serializeProject(p: Project): string {
  return JSON.stringify(p, null, 2)
}

/** Zonder inspringing: voor deellinks, zodat de URL korter blijft. */
export function serializeCompact(p: Project): string {
  return JSON.stringify(p)
}
