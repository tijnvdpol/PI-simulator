import { pinByPhysical } from '../pinout/pinout'
import type { Part } from '../project/types'
import { PART_NAMES_NL } from '../bench/benchState'

/** Bijv. " · GPIO 17": zo zie je welk nummer je in je code moet gebruiken. */
export function placeLabel(part: Part): string {
  const c = part.connection
  if (!c) return ''
  if (c.type === 'adc') return ` · kanaal ${c.channel}`
  const g = pinByPhysical(c.physical).gpio
  return g === null ? '' : ` · GPIO ${g}`
}

export const partLabel = (part: Part): string => `${PART_NAMES_NL[part.kind]}${placeLabel(part)}`
