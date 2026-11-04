import { describe, expect, it } from 'vitest'
import { HardwareState, bridgeFromState } from './hardwareState'
import type { Part } from '../project/types'

const part = (over: Partial<Part>): Part => ({ id: 'x', kind: 'led', x: 0, y: 0, connection: null, ...over })

describe('HardwareState', () => {
  it('twee views op dezelfde buffer zien elkaars writes', () => {
    const a = new HardwareState()
    const b = new HardwareState(a.buffer)
    a.setButtonPressed(17, true)
    expect(b.isButtonPressed(17)).toBe(true)
    b.setOutput(4, 0.5)
    expect(a.getOutput(4)).toBeCloseTo(0.5, 3)
  })
  it('setParts zet de onderdeelsoort per GPIO', () => {
    const s = new HardwareState()
    s.setParts([part({ connection: { type: 'pin', physical: 11 } })])
    expect(s.partKindAtGpio(17)).toBe('led')
    expect(s.partKindAtGpio(18)).toBeNull()
  })
  it('potmeter op kanaal 3', () => {
    const s = new HardwareState()
    s.setParts([part({ kind: 'potentiometer', connection: { type: 'adc', channel: 3 } })])
    expect(s.partKindAtChannel(3)).toBe('potentiometer')
    expect(s.partKindAtChannel(0)).toBeNull()
  })
  it('onderdeel op voedingspin verschijnt nergens', () => {
    const s = new HardwareState()
    s.setParts([part({ connection: { type: 'pin', physical: 2 } })])
    for (let g = 0; g < 28; g++) expect(s.partKindAtGpio(g)).toBeNull()
  })
  it('setParts wist de vorige opstelling', () => {
    const s = new HardwareState()
    s.setParts([part({ connection: { type: 'pin', physical: 11 } })])
    s.setParts([])
    expect(s.partKindAtGpio(17)).toBeNull()
  })
  it('ADC wordt afgekapt op 0..1023', () => {
    const s = new HardwareState()
    s.setAdcRaw(0, 5000)
    expect(s.getAdcRaw(0)).toBe(1023)
    s.setAdcRaw(0, -4)
    expect(s.getAdcRaw(0)).toBe(0)
  })
  it('resetOutputs wist uitgangen maar laat ingangen staan', () => {
    const s = new HardwareState()
    s.setOutput(17, 1)
    s.setButtonPressed(2, true)
    s.setAdcRaw(1, 300)
    s.resetOutputs()
    expect(s.getOutput(17)).toBe(0)
    expect(s.isButtonPressed(2)).toBe(true)
    expect(s.getAdcRaw(1)).toBe(300)
  })
})

describe('bridgeFromState', () => {
  it('sleep blokkeert echt (Atomics.wait)', () => {
    const b = bridgeFromState(new HardwareState(), () => {})
    const t0 = performance.now()
    b.sleep(0.05)
    expect(performance.now() - t0).toBeGreaterThanOrEqual(45)
  })
  it('leest en schrijft door naar de state', () => {
    const s = new HardwareState()
    const b = bridgeFromState(s, () => {})
    s.setButtonPressed(2, true)
    s.setAdcRaw(0, 77)
    b.writeOutput(17, 1)
    expect(b.readButton(2)).toBe(true)
    expect(b.readAdc(0)).toBe(77)
    expect(s.getOutput(17)).toBe(1)
  })
})
