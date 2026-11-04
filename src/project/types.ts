import type { Circuit } from '../circuit/types'
export type PartKind = 'led' | 'button' | 'buzzer' | 'temperature' | 'potentiometer'
export type LedColor = 'red' | 'green' | 'yellow' | 'blue' | 'white'

export const PART_KINDS: readonly PartKind[] = ['led', 'button', 'buzzer', 'temperature', 'potentiometer']
export const LED_COLORS: readonly LedColor[] = ['red', 'green', 'yellow', 'blue', 'white']

/** Pin wordt opgeslagen als FYSIEK nummer (1–40) zodat ook voedingspinnen kunnen. */
export type Connection = { type: 'pin'; physical: number } | { type: 'adc'; channel: number }

export interface Part {
  id: string
  kind: PartKind
  x: number
  y: number
  color?: LedColor
  connection: Connection | null
}

export type ProjectMode = 'simple' | 'pro'

export interface Project {
  version: 2
  /** Simpel: onderdelen direct op de Pi-pinnen. Pro: breadboard, draden en weerstanden. */
  mode: ProjectMode
  name: string
  /** Onderdelen van de simpele modus (leeg in een pro-project). */
  parts: Part[]
  /** De schakeling van een pro-project. */
  pro?: Circuit
  code: string
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

export const CURRENT_VERSION = 2 as const

export function emptyProject(mode: ProjectMode = 'simple'): Project {
  const base: Project = { version: CURRENT_VERSION, mode, name: 'Mijn project', parts: [], code: '' }
  return mode === 'pro' ? { ...base, pro: { parts: [], wires: [] } } : base
}
