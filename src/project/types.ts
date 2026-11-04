export type PartKind =
  | 'led' | 'button' | 'buzzer' | 'temperature' | 'potentiometer'
  | 'pwmled' | 'rgbled' | 'servo' | 'distance' | 'oled'
export type LedColor = 'red' | 'green' | 'yellow' | 'blue' | 'white'

/** Nieuwe soorten komen ALTIJD onderaan: de volgorde bepaalt de kindcodes in het gedeelde geheugen. */
export const PART_KINDS: readonly PartKind[] = [
  'led', 'button', 'buzzer', 'temperature', 'potentiometer',
  'pwmled', 'rgbled', 'servo', 'distance', 'oled',
]
export const LED_COLORS: readonly LedColor[] = ['red', 'green', 'yellow', 'blue', 'white']

/** Pin wordt opgeslagen als FYSIEK nummer (1–40) zodat ook voedingspinnen kunnen. */
export type Connection = { type: 'pin'; physical: number } | { type: 'adc'; channel: number }

/** Aansluitingen per terminal (zie `bench/terminals.ts`). Een terminal die ontbreekt is niet aangesloten. */
export type Connections = Record<string, Connection>

export interface Part {
  id: string
  kind: PartKind
  x: number
  y: number
  color?: LedColor
  connections: Connections
}

export interface Project {
  version: 2
  name: string
  parts: Part[]
  code: string
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

export const CURRENT_VERSION = 2 as const

export function emptyProject(): Project {
  return { version: CURRENT_VERSION, name: 'Mijn project', parts: [], code: '' }
}
