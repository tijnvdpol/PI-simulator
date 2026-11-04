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

export interface Project {
  version: 1
  name: string
  parts: Part[]
  code: string
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

export const CURRENT_VERSION = 1 as const

export function emptyProject(): Project {
  return { version: CURRENT_VERSION, name: 'Mijn project', parts: [], code: '' }
}
