import { PART_NAMES_NL } from '../bench/names'
import { terminalsOf } from '../bench/terminals'
import { CURRENT_VERSION, LED_COLORS, PART_KINDS, type Connection, type Connections, type LedColor, type Part, type PartKind, type Project, type Result } from './types'

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Migraties van oudere versies naar de huidige; elke stap tilt het bestand één versie op en wijzigt de invoer niet.
 * 1 → 2 (fase 2): een onderdeel kan meerdere aansluitingen hebben. `connection` wordt `connections.signal`.
 */
const migrations: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  1: (raw) => ({
    ...raw,
    version: 2,
    parts: Array.isArray(raw.parts)
      ? raw.parts.map((p) => {
          if (!isObj(p)) return p
          const { connection, ...rest } = p
          return { ...rest, connections: isObj(connection) ? { signal: connection } : {} }
        })
      : raw.parts,
  }),
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
  const kind = raw.kind as PartKind
  const connections: Connections = {}
  const given = raw.connections === undefined ? {} : raw.connections
  if (!isObj(given)) return fail('Een onderdeel heeft ongeldige aansluitingen.')
  const specs = terminalsOf(kind)
  for (const [terminal, value] of Object.entries(given)) {
    const spec = specs.find((t) => t.id === terminal)
    if (!spec) return fail(`Een ${PART_NAMES_NL[kind]} heeft geen aansluiting "${terminal}".`)
    const conn = parseConnection(value)
    if (!conn.ok) return conn
    if (conn.value === null) continue
    if ((spec.type === 'adc') !== (conn.value.type === 'adc')) return fail(`De aansluiting "${terminal}" van een ${PART_NAMES_NL[kind]} zit op de verkeerde soort plek.`)
    connections[terminal] = conn.value
  }
  const part: Part = { id: raw.id, kind, x: raw.x, y: raw.y, connections }
  if (raw.color !== undefined) {
    if (!LED_COLORS.includes(raw.color as LedColor)) return fail('Een led heeft een onbekende kleur.')
    part.color = raw.color as LedColor
  }
  return { ok: true, value: part }
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
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'Mijn project'
  return { ok: true, value: { version: CURRENT_VERSION, name, parts, code: raw.code } }
}

export function serializeProject(p: Project): string {
  return JSON.stringify(p, null, 2)
}
