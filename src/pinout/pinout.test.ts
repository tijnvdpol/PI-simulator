import { describe, expect, it } from 'vitest'
import { PINS, SPI_PINS, nearestGnd, pinByGpio, pinByPhysical } from './pinout'

const physOf = (kind: string) => PINS.filter((p) => p.kind === kind).map((p) => p.physical)

describe('pinout', () => {
  it('heeft 40 pinnen in volgorde', () => {
    expect(PINS).toHaveLength(40)
    PINS.forEach((p, i) => expect(p.physical).toBe(i + 1))
  })
  it('heeft de juiste voedings- en grondpinnen', () => {
    expect(physOf('5v')).toEqual([2, 4])
    expect(physOf('3v3')).toEqual([1, 17])
    expect(physOf('gnd')).toEqual([6, 9, 14, 20, 25, 30, 34, 39])
    expect(physOf('id')).toEqual([27, 28])
    expect(physOf('gpio')).toHaveLength(26)
  })
  it('mapt fysieke pinnen op GPIO-nummers', () => {
    const expected: Record<number, number> = { 11: 17, 3: 2, 8: 14, 12: 18, 40: 21, 24: 8, 5: 3, 13: 27, 15: 22, 19: 10 }
    for (const [phys, gpio] of Object.entries(expected)) expect(pinByPhysical(Number(phys)).gpio).toBe(gpio)
    expect(pinByGpio(17)?.physical).toBe(11)
    expect(pinByGpio(99)).toBeUndefined()
  })
  it('elke GPIO komt precies één keer voor', () => {
    const gpios = PINS.filter((p) => p.gpio !== null).map((p) => p.gpio)
    expect(new Set(gpios).size).toBe(gpios.length)
  })
  it('vindt de dichtstbijzijnde GND', () => {
    expect(nearestGnd(11)).toBe(9)
    expect(nearestGnd(40)).toBe(39)
  })
  it('heeft voor elke pin een functie-uitleg', () => {
    PINS.forEach((p) => expect(p.functie.length).toBeGreaterThan(3))
  })
  it('kent de SPI-pinnen', () => {
    expect(SPI_PINS).toEqual({ mosi: 19, miso: 21, sclk: 23, ce0: 24 })
  })
})
