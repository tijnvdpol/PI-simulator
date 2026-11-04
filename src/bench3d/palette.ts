import { useMemo } from 'react'
import { Color } from 'three'

/** Thema-tokens (uit `theme.css`) die de 3D-scène gebruikt. */
export const PALETTE_TOKENS = [
  'bg', 'panel', 'line', 'fg', 'fg-muted', 'board', 'gold', 'accent', 'danger', 'warning',
  'metal', 'metal-dark', 'ink',
  'led-red', 'led-green', 'led-yellow', 'led-blue', 'led-white',
  'wire-red', 'wire-black', 'wire-blue', 'wire-green', 'wire-yellow', 'wire-orange', 'wire-purple',
] as const

export type PaletteToken = (typeof PALETTE_TOKENS)[number]
export type Palette = Record<PaletteToken, Color>

/** Leest de kleuren uit de CSS-variabelen, zodat het thema op één plek blijft. Een ontbrekend token wordt opvallend magenta. */
export function readPalette(el: Element = document.documentElement): Palette {
  const css = getComputedStyle(el)
  const out = {} as Palette
  for (const t of PALETTE_TOKENS) {
    const raw = css.getPropertyValue(`--color-${t}`).trim()
    out[t] = new Color(raw || 'magenta')
  }
  return out
}

export const usePalette = (): Palette => useMemo(() => readPalette(), [])
