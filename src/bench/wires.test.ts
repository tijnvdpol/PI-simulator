import { describe, expect, it } from 'vitest'
import { computeWires } from './wires'
import type { Part } from '../project/types'

const p = (over: Partial<Part> & Pick<Part, 'id' | 'kind'>): Part => ({ x: 0, y: 0, connection: null, ...over })

describe('computeWires', () => {
  it('led op pin 11: signaaldraad naar 11 en zwarte draad naar GND 9, geen rode', () => {
    const w = computeWires([p({ id: 'a', kind: 'led', connection: { type: 'pin', physical: 11 } })])
    expect(w.filter((x) => x.kind === 'signal')).toMatchObject([{ from: { part: 'a' }, to: { physical: 11 } }])
    const gnd = w.filter((x) => x.kind === 'ground')
    expect(gnd).toMatchObject([{ from: { part: 'a' }, to: { physical: 9 }, color: 'black' }])
    expect(w.some((x) => x.color === 'red')).toBe(false)
  })
  it('signaalkleur is nooit rood of zwart', () => {
    const w = computeWires([p({ id: 'a', kind: 'led', connection: { type: 'pin', physical: 11 } })])
    const c = w.find((x) => x.kind === 'signal')!.color
    expect(['red', 'black']).not.toContain(c)
  })
  it('onderdelen krijgen verschillende signaalkleuren', () => {
    const w = computeWires([
      p({ id: 'a', kind: 'led', connection: { type: 'pin', physical: 11 } }),
      p({ id: 'b', kind: 'button', connection: { type: 'pin', physical: 13 } }),
    ]).filter((x) => x.kind === 'signal')
    expect(w[0].color).not.toBe(w[1].color)
  })
  it('onverbonden onderdeel → geen draden', () => {
    expect(computeWires([p({ id: 'a', kind: 'led' })])).toEqual([])
  })
  it('potmeter op CH0: kanaaldraad, 3V3 rood (pin 1), GND zwart en 4 SPI-draden', () => {
    const w = computeWires([p({ id: 'a', kind: 'potentiometer', connection: { type: 'adc', channel: 0 } })])
    expect(w.find((x) => x.from && 'part' in x.from && x.from.part === 'a')?.to).toEqual({ chip: 'mcp3008', channel: 0 })
    expect(w.filter((x) => x.kind === 'power')).toMatchObject([{ to: { physical: 1 }, color: 'red' }])
    expect(w.filter((x) => x.kind === 'ground')).toMatchObject([{ color: 'black' }])
    const spi = w.filter((x) => x.label && ['MOSI', 'MISO', 'SCLK', 'CE0'].includes(x.label))
    expect(spi.map((x) => (x.to as { physical: number }).physical).sort()).toEqual([19, 21, 23, 24])
  })
  it('twee analoge onderdelen: chip-draden maar één keer', () => {
    const w = computeWires([
      p({ id: 'a', kind: 'potentiometer', connection: { type: 'adc', channel: 0 } }),
      p({ id: 'b', kind: 'temperature', connection: { type: 'adc', channel: 1 } }),
    ])
    expect(w.filter((x) => x.kind === 'power')).toHaveLength(1)
    expect(w.filter((x) => x.label === 'MOSI')).toHaveLength(1)
    expect(w.filter((x) => x.to && 'channel' in x.to)).toHaveLength(2)
  })
  it('onderdeel op 5V-pin: rode draad naar die pin, plus GND-draad', () => {
    const w = computeWires([p({ id: 'a', kind: 'led', connection: { type: 'pin', physical: 2 } })])
    expect(w.find((x) => x.kind === 'power')).toMatchObject({ to: { physical: 2 }, color: 'red' })
  })
  it('wire-ids zijn uniek', () => {
    const w = computeWires([
      p({ id: 'a', kind: 'potentiometer', connection: { type: 'adc', channel: 0 } }),
      p({ id: 'b', kind: 'led', connection: { type: 'pin', physical: 11 } }),
    ])
    expect(new Set(w.map((x) => x.id)).size).toBe(w.length)
  })
})
