import { CURRENT_VERSION, LED_COLORS, PART_KINDS, type Connection, type LedColor, type Part, type PartKind, type Project, type Result } from './types'

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Migraties van oudere versies naar de huidige. Versie 1 is de eerste, dus nog leeg;
 * een toekomstige versie 2 voegt hier `1: (raw) => ({ ...raw, version: 2 })` toe.
 */
const migrations: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {}

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
