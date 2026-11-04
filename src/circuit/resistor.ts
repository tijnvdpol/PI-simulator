/** Keuzelijst voor de weerstandswaarde (in ohm). */
export const RESISTOR_VALUES: readonly number[] = [10, 22, 47, 100, 150, 220, 330, 470, 680, 1000, 2200, 4700, 10000, 22000, 47000, 100000, 1_000_000]

const nl = (n: number) => String(n).replace('.', ',')

export function formatOhm(ohm: number): string {
  if (ohm >= 1_000_000) return `${nl(ohm / 1_000_000)} MΩ`
  if (ohm >= 1000) return `${nl(ohm / 1000)} kΩ`
  return `${nl(ohm)} Ω`
}

export type BandColor = 'black' | 'brown' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'violet' | 'grey' | 'white' | 'gold'
const DIGIT: BandColor[] = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white']

/** Vier ringen: twee cijfers, vermenigvuldiger en tolerantie (goud, 5%). */
export function resistorBands(ohm: number): [BandColor, BandColor, BandColor, BandColor] {
  const v = Math.max(1, Math.round(ohm))
  const exp = Math.max(0, String(v).length - 2)
  const two = Math.round(v / 10 ** exp)
  return [DIGIT[Math.floor(two / 10) % 10], DIGIT[two % 10], DIGIT[exp], 'gold']
}
