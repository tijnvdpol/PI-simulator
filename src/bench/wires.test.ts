import { describe, expect, it } from 'vitest'
import { computeWires } from './wires'
import type { Part } from '../project/types'

const p = (over: Partial<Part> & Pick<Part, 'id' | 'kind'>): Part => ({ x: 0, y: 0, connections: {}, ...over })

describe('computeWires', () => {
  it('led op pin 11: signaaldraad naar 11 en zwarte draad naar GND 9, geen rode', () => {
    const w = computeWires([p({ id: 'a', kind: 'led', connections: { signal: { type: 'pin', physical: 11 } } })])
    expect(w.filter((x) => x.kind === 'signal')).toMatchObject([{ from: { part: 'a' }, to: { physical: 11 } }])
    const gnd = w.filter((x) => x.kind === 'ground')
    expect(gnd).toMatchObject([{ from: { part: 'a' }, to: { physical: 9 }, color: 'black' }])
    expect(w.some((x) => x.color === 'red')).toBe(false)
  })
  it('signaalkleur is nooit rood of zwart', () => {
    const w = computeWires([p({ id: 'a', kind: 'led', connections: { signal: { type: 'pin', physical: 11 } } })])
    const c = w.find((x) => x.kind === 'signal')!.color
    expect(['red', 'black']).not.toContain(c)
  })
  it('onderdelen krijgen verschillende signaalkleuren', () => {
    const w = computeWires([
      p({ id: 'a', kind: 'led', connections: { signal: { type: 'pin', physical: 11 } } }),
      p({ id: 'b', kind: 'button', connections: { signal: { type: 'pin', physical: 13 } } }),
    ]).filter((x) => x.kind === 'signal')
    expect(w[0].color).not.toBe(w[1].color)
  })
  it('onverbonden onderdeel → geen draden', () => {
    expect(computeWires([p({ id: 'a', kind: 'led' })])).toEqual([])
  })
  it('potmeter op CH0: kanaaldraad, 3V3 rood (pin 1), GND zwart en 4 SPI-draden', () => {
    const w = computeWires([p({ id: 'a', kind: 'potentiometer', connections: { signal: { type: 'adc', channel: 0 } } })])
    expect(w.find((x) => x.from && 'part' in x.from && x.from.part === 'a')?.to).toEqual({ chip: 'mcp3008', channel: 0 })
    expect(w.filter((x) => x.kind === 'power')).toMatchObject([{ to: { physical: 1 }, color: 'red' }])
    expect(w.filter((x) => x.kind === 'ground')).toMatchObject([{ color: 'black' }])
    const spi = w.filter((x) => x.label && ['MOSI', 'MISO', 'SCLK', 'CE0'].includes(x.label))
    expect(spi.map((x) => (x.to as { physical: number }).physical).sort()).toEqual([19, 21, 23, 24])
  })
  it('twee analoge onderdelen: chip-draden maar één keer', () => {
    const w = computeWires([
      p({ id: 'a', kind: 'potentiometer', connections: { signal: { type: 'adc', channel: 0 } } }),
      p({ id: 'b', kind: 'temperature', connections: { signal: { type: 'adc', channel: 1 } } }),
    ])
    expect(w.filter((x) => x.kind === 'power')).toHaveLength(1)
    expect(w.filter((x) => x.label === 'MOSI')).toHaveLength(1)
    expect(w.filter((x) => x.to && 'channel' in x.to)).toHaveLength(2)
  })
  it('onderdeel op 5V-pin: rode draad naar die pin, plus GND-draad', () => {
    const w = computeWires([p({ id: 'a', kind: 'led', connections: { signal: { type: 'pin', physical: 2 } } })])
    expect(w.find((x) => x.kind === 'power')).toMatchObject({ to: { physical: 2 }, color: 'red' })
  })
  it('wire-ids zijn uniek', () => {
    const w = computeWires([
      p({ id: 'a', kind: 'potentiometer', connections: { signal: { type: 'adc', channel: 0 } } }),
      p({ id: 'b', kind: 'led', connections: { signal: { type: 'pin', physical: 11 } } }),
    ])
    expect(new Set(w.map((x) => x.id)).size).toBe(w.length)
  })
})

describe('computeWires met meerdere aansluitingen', () => {
  const pin = (physical: number) => ({ type: 'pin' as const, physical })
  it('servo: een draad per aansluiting — signaal gekleurd, 5V rood, GND zwart — en geen automatische GND-draad erbij', () => {
    const w = computeWires([p({ id: 's', kind: 'servo', connections: { signal: pin(12), v5: pin(2), gnd: pin(6) } })])
    expect(w.map((x) => x.id).sort()).toEqual(['s:gnd', 's:signal', 's:v5'])
    expect(w.find((x) => x.id === 's:v5')).toMatchObject({ kind: 'power', color: 'red', to: { physical: 2 }, terminal: 'v5' })
    expect(w.find((x) => x.id === 's:gnd')).toMatchObject({ kind: 'ground', color: 'black', to: { physical: 6 }, terminal: 'gnd' })
    expect(w.find((x) => x.id === 's:signal')).toMatchObject({ kind: 'signal', to: { physical: 12 } })
  })
  it('alleen aangesloten terminals krijgen een draad', () => {
    const w = computeWires([p({ id: 'o', kind: 'oled', connections: { sda: pin(3) } })])
    expect(w.map((x) => x.id)).toEqual(['o:sda'])
  })
  it('RGB-led: drie signaaldraden met verschillende kleuren', () => {
    const w = computeWires([p({ id: 'r', kind: 'rgbled', connections: { r: pin(11), g: pin(13), b: pin(15), gnd: pin(14) } })])
    const colors = w.filter((x) => x.kind === 'signal').map((x) => x.color)
    expect(colors).toHaveLength(3)
    expect(new Set(colors).size).toBe(3)
  })
  it('dimbare led werkt zoals een gewone led: signaal plus automatische GND', () => {
    const w = computeWires([p({ id: 'd', kind: 'pwmled', connections: { signal: pin(12) } })])
    expect(w.map((x) => x.id).sort()).toEqual(['d:gnd', 'd:signal'])
  })
  it('afstandssensor: trigger en echo zijn signaaldraden', () => {
    const w = computeWires([p({ id: 'a', kind: 'distance', connections: { trigger: pin(16), echo: pin(18), v5: pin(4), gnd: pin(14) } })])
    expect(w.filter((x) => x.kind === 'signal').map((x) => x.terminal).sort()).toEqual(['echo', 'trigger'])
  })
})
