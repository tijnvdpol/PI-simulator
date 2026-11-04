import type { WireColor } from '../bench/wires'
import type { LedColor } from '../project/types'

export type ProKind = 'led' | 'resistor' | 'button' | 'buzzer' | 'temperature' | 'potentiometer'
export const PRO_KINDS: readonly ProKind[] = ['led', 'resistor', 'button', 'buzzer', 'temperature', 'potentiometer']

export type Rot = 0 | 1 | 2 | 3

/** Een onderdeel op het breadboard. De poten volgen uit anker (kolom + rij) en draaiing. */
export interface ProPart {
  id: string
  kind: ProKind
  /** Kolom 1..30 van het ankergat (de eerste poot). */
  col: number
  /** Rij 0..9 (a..j) van het ankergat. */
  row: number
  rot: Rot
  /** Ohm; alleen bij een weerstand. */
  resistance?: number
  color?: LedColor
}

/** Jumperdraad tussen twee aansluitpunten (terminal-ids, zie breadboard.ts). */
export interface ProWire {
  id: string
  a: string
  b: string
  color: WireColor
}

export interface Circuit { parts: ProPart[]; wires: ProWire[] }

export const emptyCircuit = (): Circuit => ({ parts: [], wires: [] })

export const PRO_NAMES_NL: Record<ProKind, string> = {
  led: 'led', resistor: 'weerstand', button: 'knop', buzzer: 'buzzer', temperature: 'temperatuursensor', potentiometer: 'potmeter',
}
