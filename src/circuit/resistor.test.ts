import { describe, expect, it } from 'vitest'
import { RESISTOR_VALUES, formatOhm, resistorBands } from './resistor'

describe('weerstandswaarde', () => {
  it('schrijft ohm, kilo-ohm en mega-ohm in het Nederlands', () => {
    expect(formatOhm(220)).toBe('220 Ω')
    expect(formatOhm(1000)).toBe('1 kΩ')
    expect(formatOhm(4700)).toBe('4,7 kΩ')
    expect(formatOhm(47000)).toBe('47 kΩ')
    expect(formatOhm(1_000_000)).toBe('1 MΩ')
  })
  it('kleurringen volgens de standaardcode', () => {
    expect(resistorBands(220)).toEqual(['red', 'red', 'brown', 'gold'])
    expect(resistorBands(330)).toEqual(['orange', 'orange', 'brown', 'gold'])
    expect(resistorBands(1000)).toEqual(['brown', 'black', 'red', 'gold'])
    expect(resistorBands(4700)).toEqual(['yellow', 'violet', 'red', 'gold'])
    expect(resistorBands(10)).toEqual(['brown', 'black', 'black', 'gold'])
    expect(resistorBands(10000)).toEqual(['brown', 'black', 'orange', 'gold'])
    expect(resistorBands(1_000_000)).toEqual(['brown', 'black', 'green', 'gold'])
  })
  it('alle keuzes hebben een nette kleurcode', () => {
    for (const v of RESISTOR_VALUES) expect(resistorBands(v)).toHaveLength(4)
    expect(RESISTOR_VALUES).toContain(330)
  })
})
