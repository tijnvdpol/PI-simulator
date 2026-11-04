import { PART_NAMES_NL } from './names'
import type { Part } from '../project/types'
import { pinFit, terminalsOf, type TerminalSpec } from './terminals'

export interface PartIssue {
  partId: string
  terminal?: string
  /** missing: er ontbreken aansluitingen · no-power: voeding ontbreekt · unsuitable: een aansluiting zit op een pin die er niet bij past. */
  code: 'missing' | 'no-power' | 'unsuitable'
  message: string
}

const isPower = (t: TerminalSpec) => t.type === 'v5' || t.type === 'v33'

export function missingTerminals(part: Part): TerminalSpec[] {
  return terminalsOf(part.kind).filter((t) => !part.connections[t.id])
}

function unsuitable(part: Part): { spec: TerminalSpec; reason: string }[] {
  const out: { spec: TerminalSpec; reason: string }[] = []
  for (const spec of terminalsOf(part.kind)) {
    const c = part.connections[spec.id]
    if (!c || c.type !== 'pin') continue
    const fit = pinFit(spec, c.physical)
    if (!fit.ok) out.push({ spec, reason: fit.reason ?? '' })
  }
  return out
}

/** Een onderdeel is compleet als alles is aangesloten op een pin die erbij past; pas dan doet het mee. */
export const isComplete = (part: Part): boolean => missingTerminals(part).length === 0 && unsuitable(part).length === 0

const list = (names: string[]) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} en ${names[names.length - 1]}`)

/** Meldingen over aansluitingen, in het Nederlands. Onderdelen met een melding krijgen in 3D een oranje rand. */
export function partIssues(parts: Part[]): PartIssue[] {
  const out: PartIssue[] = []
  for (const part of parts) {
    const name = PART_NAMES_NL[part.kind]
    const missing = missingTerminals(part)
    const power = missing.filter(isPower)
    for (const spec of power) {
      out.push({
        partId: part.id, terminal: spec.id, code: 'no-power',
        message: `Je ${name} heeft geen ${spec.label}-voeding. ${spec.why} Sluit hem aan op een ${spec.label}-pin, anders doet hij niets.`,
      })
    }
    const rest = missing.filter((t) => !isPower(t))
    if (rest.length > 0) {
      const single = terminalsOf(part.kind).length === 1
      out.push({
        partId: part.id, terminal: rest[0].id, code: 'missing',
        message: single
          ? `Je ${name} zit nog nergens op vast. Klik op het onderdeel en kies ${terminalsOf(part.kind)[0].type === 'adc' ? 'een kanaal van de chip' : 'een pin'}.`
          : `Je ${name} mist nog: ${list(rest.map((t) => t.label))}. Sluit alle aansluitingen aan, anders doet hij niets.`,
      })
    }
    for (const u of unsuitable(part)) out.push({ partId: part.id, terminal: u.spec.id, code: 'unsuitable', message: u.reason })
  }
  return out
}
