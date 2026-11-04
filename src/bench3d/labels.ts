import { pinByPhysical } from '../pinout/pinout'
import type { Part } from '../project/types'
import { PART_NAMES_NL } from '../bench/names'
import { terminalsOf } from '../bench/terminals'

/** Bijv. " · GPIO 17": zo zie je welk nummer je in je code moet gebruiken. Meerdere GPIO-aansluitingen: " · Rood GPIO 17, Groen GPIO 27". */
export function placeLabel(part: Part): string {
  const items: string[] = []
  for (const spec of terminalsOf(part.kind)) {
    const c = part.connections[spec.id]
    if (!c) continue
    if (c.type === 'adc') { items.push(`kanaal ${c.channel}`); continue }
    if (spec.type !== 'gpio') continue
    const g = pinByPhysical(c.physical).gpio
    if (g !== null) items.push(`GPIO ${g}`)
  }
  if (items.length === 0) return ''
  const gpioSpecs = terminalsOf(part.kind).filter((t) => t.type === 'gpio' || t.type === 'adc')
  if (gpioSpecs.length <= 1) return ` · ${items[0]}`
  const named = gpioSpecs.flatMap((spec) => {
    const c = part.connections[spec.id]
    if (!c) return []
    const text = c.type === 'adc' ? `kanaal ${c.channel}` : (() => { const g = pinByPhysical(c.physical).gpio; return g === null ? '' : `GPIO ${g}` })()
    return text ? [`${spec.label} ${text}`] : []
  })
  return named.length ? ` · ${named.join(', ')}` : ''
}

export const partLabel = (part: Part): string => `${PART_NAMES_NL[part.kind]}${placeLabel(part)}`
