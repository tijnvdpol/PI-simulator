import type { ReactNode } from 'react'
import type { PinIssue } from '../engine/explainError'
import type { Part } from '../project/types'
import type { BenchAction } from './benchState'

/** Levende waarden per onderdeel, gelezen uit het gedeelde geheugen terwijl het programma draait. */
export interface PartLive {
  level?: number        // led/buzzer-uitgang 0..1
  pressed?: boolean     // knop
  celsius?: number      // temperatuursensor
  position?: number     // potmeter 0..1
}

/** Wat de werkbank (de 3D-weergave) van de app nodig heeft. */
export interface BenchProps {
  parts: Part[]
  connecting: string | null
  error: string | null
  locked: boolean
  dispatch: (a: BenchAction) => void
  issues?: PinIssue[]
  /** Levende waarden per onderdeel (tijdens het draaien). */
  live?: (part: Part) => PartLive
  /** Extra inhoud over de werkbank (bijv. de lege-staat-uitnodiging). */
  children?: ReactNode
  /** Knop ingedrukt/losgelaten tijdens het draaien. */
  onPartPress?: (part: Part, pressed: boolean) => void
  /** Schuifjes voor sensoren: waarde per onderdeel (°C bij temperatuur, 0..1 bij potmeter). */
  sensors?: { values: Record<string, number>; onChange: (part: Part, value: number) => void }
}
