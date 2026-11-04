import { holeId, COLS, ROWS } from './breadboard'
import type { ProKind, ProPart, Rot } from './types'

export interface LegDef { name: string; dc: number; dr: number; label: string }

/**
 * Poten per onderdeel, ten opzichte van het ankergat (draaiing 0).
 * Een knop (4 poten) hoort over de middenspleet: anker op rij e, de onderste poten op rij f.
 */
export const LEGS: Record<ProKind, LegDef[]> = {
  led: [
    { name: 'anode', dc: 0, dr: 0, label: 'anode (+, lange poot)' },
    { name: 'kathode', dc: 1, dr: 0, label: 'kathode (−, korte poot)' },
  ],
  resistor: [{ name: 'a', dc: 0, dr: 0, label: 'poot 1' }, { name: 'b', dc: 4, dr: 0, label: 'poot 2' }],
  button: [
    { name: 'a', dc: 0, dr: 0, label: 'linksboven' }, { name: 'b', dc: 2, dr: 0, label: 'rechtsboven' },
    { name: 'c', dc: 0, dr: 1, label: 'linksonder' }, { name: 'd', dc: 2, dr: 1, label: 'rechtsonder' },
  ],
  buzzer: [{ name: 'plus', dc: 0, dr: 0, label: 'plus (+)' }, { name: 'min', dc: 3, dr: 0, label: 'min (−)' }],
  temperature: [
    { name: 'vcc', dc: 0, dr: 0, label: 'voeding (VCC)' }, { name: 'out', dc: 1, dr: 0, label: 'uitgang' }, { name: 'gnd', dc: 2, dr: 0, label: 'aarde (GND)' },
  ],
  potentiometer: [
    { name: 'e1', dc: 0, dr: 0, label: 'uiteinde 1' }, { name: 'wiper', dc: 1, dr: 0, label: 'loper (midden)' }, { name: 'e2', dc: 2, dr: 0, label: 'uiteinde 2' },
  ],
}

/** Poten die binnen het onderdeel altijd met elkaar verbonden zijn (een knop: de twee kanten van het huis). */
export const INTERNAL_PAIRS: Partial<Record<ProKind, [string, string][]>> = {
  button: [['a', 'b'], ['c', 'd']],
}

const rotate = (dc: number, dr: number, rot: Rot): [number, number] => {
  let c = dc
  let r = dr
  for (let i = 0; i < rot; i++) { const nc = -r; r = c; c = nc }
  return [c, r]
}

export interface LegPlace { name: string; col: number; row: number; hole: string }

/** Waar de poten van een onderdeel zitten (kan buiten het bord vallen: zie `fits`). */
export function legPlaces(part: Pick<ProPart, 'kind' | 'col' | 'row' | 'rot'>): LegPlace[] {
  return LEGS[part.kind].map((l) => {
    const [dc, dr] = rotate(l.dc, l.dr, part.rot)
    const col = part.col + dc
    const row = part.row + dr
    return { name: l.name, col, row, hole: holeId(col, row) }
  })
}

export const legTerminal = (partId: string, leg: string): string => `leg:${partId}:${leg}`

export function fits(part: Pick<ProPart, 'kind' | 'col' | 'row' | 'rot'>): boolean {
  return legPlaces(part).every((l) => l.col >= 1 && l.col <= COLS && l.row >= 0 && l.row < ROWS)
}

/** Kan dit onderdeel hier staan? Het moet op het bord passen en mag geen bezet gaatje gebruiken. */
export function canPlace(part: ProPart, others: ProPart[]): boolean {
  if (!fits(part)) return false
  const used = new Set(others.filter((o) => o.id !== part.id).flatMap((o) => legPlaces(o).map((l) => l.hole)))
  return legPlaces(part).every((l) => !used.has(l.hole))
}
