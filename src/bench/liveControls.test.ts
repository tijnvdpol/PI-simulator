import { describe, expect, it } from 'vitest'
import { HardwareState } from '../engine/hardwareState'
import type { Part } from '../project/types'
import { celsiusToRaw, defaultSensorValue, positionToRaw, snapshot, syncAnalog } from './liveControls'

const part = (over: Partial<Part> & Pick<Part, 'id' | 'kind'>): Part => ({ x: 0, y: 0, connection: null, ...over })

describe('liveControls', () => {
  it('25 °C is raw ≈ 232,5 (0,75 V op 3,3 V)', () => {
    expect(Math.abs(celsiusToRaw(25) - 232.5)).toBeLessThanOrEqual(0.5) // 0,75 V / 3,3 V × 1023 = 232,5
    expect(celsiusToRaw(-10)).toBeGreaterThanOrEqual(0)
    expect(celsiusToRaw(50)).toBeLessThanOrEqual(1023)
  })
  it('potmeter 0..1 → raw 0..1023', () => {
    expect(positionToRaw(0)).toBe(0)
    expect(positionToRaw(1)).toBe(1023)
    expect(positionToRaw(0.5)).toBe(512)
  })
  it('defaults: temperatuur 20 °C, potmeter 0,5', () => {
    expect(defaultSensorValue('temperature')).toBe(20)
    expect(defaultSensorValue('potentiometer')).toBe(0.5)
  })
  it('syncAnalog schrijft per kanaal en wist oude kanalen', () => {
    const s = new HardwareState()
    s.setAdcRaw(5, 999)
    syncAnalog(s, [
      part({ id: 'a', kind: 'temperature', connection: { type: 'adc', channel: 0 } }),
      part({ id: 'b', kind: 'potentiometer', connection: { type: 'adc', channel: 3 } }),
    ], { a: 25, b: 1 })
    expect(s.getAdcRaw(0)).toBe(celsiusToRaw(25))
    expect(s.getAdcRaw(3)).toBe(1023)
    expect(s.getAdcRaw(5)).toBe(0)
  })
  it('syncAnalog gebruikt defaults als er geen waarde is', () => {
    const s = new HardwareState()
    syncAnalog(s, [part({ id: 'a', kind: 'temperature', connection: { type: 'adc', channel: 1 } })], {})
    expect(s.getAdcRaw(1)).toBe(celsiusToRaw(20))
  })
  it('snapshot leest led-niveau, knop en sensorwaarden', () => {
    const s = new HardwareState()
    s.setOutput(17, 1)
    s.setButtonPressed(27, true)
    const snap = snapshot(s, [
      part({ id: 'l', kind: 'led', connection: { type: 'pin', physical: 11 } }),
      part({ id: 'k', kind: 'button', connection: { type: 'pin', physical: 13 } }),
      part({ id: 't', kind: 'temperature', connection: { type: 'adc', channel: 0 } }),
      part({ id: 'z', kind: 'buzzer', connection: { type: 'pin', physical: 2 } }),
    ], { t: 30 })
    expect(snap.l.level).toBe(1)
    expect(snap.k.pressed).toBe(true)
    expect(snap.t.celsius).toBe(30)
    expect(snap.z.level).toBe(0) // voedingspin: geen GPIO
  })
})

describe('syncAnalog schrijft nooit een tussenwaarde 0 (kort "−50 °C" in een leeslus)', () => {
  it('elk kanaal krijgt precies één schrijfactie, met de eindwaarde', () => {
    const s = new HardwareState()
    const writes: [number, number][] = []
    const orig = s.setAdcRaw.bind(s)
    s.setAdcRaw = (c, raw) => { writes.push([c, raw]); orig(c, raw) }
    syncAnalog(s, [part({ id: 'a', kind: 'temperature', connection: { type: 'adc', channel: 0 } })], { a: 25 })
    expect(writes.filter(([c]) => c === 0)).toEqual([[0, celsiusToRaw(25)]])
    expect(writes).toHaveLength(8)
  })
})
