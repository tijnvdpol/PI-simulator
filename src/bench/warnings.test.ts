import { describe, expect, it } from 'vitest'
import { benchWarnings } from './warnings'
import type { Part } from '../project/types'

const led = (physical: number): Part => ({ id: 'a', kind: 'led', x: 0, y: 0, connection: { type: 'pin', physical } })

describe('benchWarnings', () => {
  it('5V, GND en 3V3 geven een waarschuwing met uitleg', () => {
    expect(benchWarnings([led(2)])[0]).toMatchObject({ partId: 'a', physical: 2 })
    expect(benchWarnings([led(2)])[0].message).toContain('5V')
    expect(benchWarnings([led(6)])[0].message).toContain('GND')
    expect(benchWarnings([led(1)])[0].message).toContain('3V3')
  })
  it('GPIO-pin geeft geen waarschuwing; onverbonden en ADC ook niet', () => {
    expect(benchWarnings([led(11)])).toEqual([])
    expect(benchWarnings([{ id: 'b', kind: 'led', x: 0, y: 0, connection: null }])).toEqual([])
    expect(benchWarnings([{ id: 'c', kind: 'potentiometer', x: 0, y: 0, connection: { type: 'adc', channel: 1 } }])).toEqual([])
  })
})
