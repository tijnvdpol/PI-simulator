import { describe, expect, it } from 'vitest'
import { HardwareState } from '../engine/hardwareState'
import type { Part } from '../project/types'
import { celsiusToRaw, defaultSensorValue, positionToRaw, sliderFor, snapshot, syncAnalog, syncDistance } from './liveControls'

const part = (over: Partial<Part> & Pick<Part, 'id' | 'kind'>): Part => ({ x: 0, y: 0, connections: {}, ...over })

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
      part({ id: 'a', kind: 'temperature', connections: { signal: { type: 'adc', channel: 0 } } }),
      part({ id: 'b', kind: 'potentiometer', connections: { signal: { type: 'adc', channel: 3 } } }),
    ], { a: 25, b: 1 })
    expect(s.getAdcRaw(0)).toBe(celsiusToRaw(25))
    expect(s.getAdcRaw(3)).toBe(1023)
    expect(s.getAdcRaw(5)).toBe(0)
  })
  it('syncAnalog gebruikt defaults als er geen waarde is', () => {
    const s = new HardwareState()
    syncAnalog(s, [part({ id: 'a', kind: 'temperature', connections: { signal: { type: 'adc', channel: 1 } } })], {})
    expect(s.getAdcRaw(1)).toBe(celsiusToRaw(20))
  })
  it('snapshot leest led-niveau, knop en sensorwaarden', () => {
    const s = new HardwareState()
    s.setOutput(17, 1)
    s.setButtonPressed(27, true)
    const snap = snapshot(s, [
      part({ id: 'l', kind: 'led', connections: { signal: { type: 'pin', physical: 11 } } }),
      part({ id: 'k', kind: 'button', connections: { signal: { type: 'pin', physical: 13 } } }),
      part({ id: 't', kind: 'temperature', connections: { signal: { type: 'adc', channel: 0 } } }),
      part({ id: 'z', kind: 'buzzer', connections: { signal: { type: 'pin', physical: 2 } } }),
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
    syncAnalog(s, [part({ id: 'a', kind: 'temperature', connections: { signal: { type: 'adc', channel: 0 } } })], { a: 25 })
    expect(writes.filter(([c]) => c === 0)).toEqual([[0, celsiusToRaw(25)]])
    expect(writes).toHaveLength(8)
  })
})

const pin = (physical: number) => ({ type: 'pin' as const, physical })
const full = {
  servo: { signal: pin(12), v5: pin(2), gnd: pin(6) },
  rgbled: { r: pin(11), g: pin(13), b: pin(15), gnd: pin(14) },
  distance: { trigger: pin(16), echo: pin(18), v5: pin(4), gnd: pin(14) },
  oled: { sda: pin(3), scl: pin(5), v33: pin(1), gnd: pin(6) },
}

describe('schuifjes', () => {
  it('afstandssensor: 2–400 cm, standaard 100 cm; temperatuur en potmeter houden hun bereik', () => {
    expect(sliderFor('distance')).toMatchObject({ min: 2, max: 400, step: 1, initial: 100 })
    expect(sliderFor('temperature')).toMatchObject({ min: -10, max: 50, initial: 20 })
    expect(sliderFor('potentiometer')).toMatchObject({ min: 0, max: 1, initial: 0.5 })
    expect(sliderFor('led')).toBeUndefined()
    expect(sliderFor('oled')).toBeUndefined()
  })
  it('formattering in het Nederlands', () => {
    expect(sliderFor('distance')!.format(123)).toBe('123 cm')
    expect(sliderFor('temperature')!.format(21.5)).toBe('21.5 °C')
    expect(sliderFor('potentiometer')!.format(0.5)).toBe('50%')
  })
  it('defaultSensorValue geldt ook voor afstand', () => {
    expect(defaultSensorValue('distance')).toBe(100)
  })
})

describe('syncDistance', () => {
  it('schrijft de afstand naar de echo-pin van een compleet aangesloten sensor', () => {
    const s = new HardwareState()
    syncDistance(s, [part({ id: 'd', kind: 'distance', connections: full.distance })], { d: 37 })
    expect(s.getDistanceCm(24)).toBe(37)
  })
  it('standaard 100 cm als er geen schuifwaarde is', () => {
    const s = new HardwareState()
    syncDistance(s, [part({ id: 'd', kind: 'distance', connections: full.distance })], {})
    expect(s.getDistanceCm(24)).toBe(100)
  })
  it('zonder voeding is er geen echo (0) en oude echo-pinnen worden gewist', () => {
    const s = new HardwareState()
    s.setDistanceCm(5, 80)
    const { v5: _v, ...noPower } = full.distance
    syncDistance(s, [part({ id: 'd', kind: 'distance', connections: noPower })], { d: 37 })
    expect(s.getDistanceCm(24)).toBe(0)
    expect(s.getDistanceCm(5)).toBe(0)
  })
})

describe('snapshot van de nieuwe onderdelen', () => {
  it('dimbare led: helderheid van de pin', () => {
    const s = new HardwareState()
    s.setOutput(18, 0.4)
    expect(snapshot(s, [part({ id: 'p', kind: 'pwmled', connections: { signal: pin(12) } })], {}).p.level).toBeCloseTo(0.4, 2)
  })
  it('RGB-led: drie niveaus', () => {
    const s = new HardwareState()
    s.setOutput(17, 1); s.setOutput(27, 0.5); s.setOutput(22, 0)
    const rgb = snapshot(s, [part({ id: 'r', kind: 'rgbled', connections: full.rgbled })], {}).r.rgb!
    expect(rgb.map((x) => Math.round(x * 10) / 10)).toEqual([1, 0.5, 0])
  })
  it('RGB-led zonder GND is "stroomloos": alles uit', () => {
    const s = new HardwareState()
    s.setOutput(17, 1)
    const { gnd: _g, ...noGnd } = full.rgbled
    expect(snapshot(s, [part({ id: 'r', kind: 'rgbled', connections: noGnd })], {}).r.rgb).toEqual([0, 0, 0])
  })
  it('servo: stand 0–1, null als hij ontkoppeld is', () => {
    const s = new HardwareState()
    const parts = [part({ id: 's', kind: 'servo', connections: full.servo })]
    expect(snapshot(s, parts, {}).s.servo).toBeNull()
    s.setServo(18, 0.75)
    expect(snapshot(s, parts, {}).s.servo).toBeCloseTo(0.75, 2)
  })
  it('servo zonder 5V beweegt niet: stand blijft null', () => {
    const s = new HardwareState()
    s.setServo(18, 1)
    const { v5: _v, ...noPower } = full.servo
    expect(snapshot(s, [part({ id: 's', kind: 'servo', connections: noPower })], {}).s.servo).toBeNull()
  })
  it('afstandssensor: toont de waarde van het schuifje', () => {
    const s = new HardwareState()
    expect(snapshot(s, [part({ id: 'd', kind: 'distance', connections: full.distance })], { d: 55 }).d.distanceCm).toBe(55)
  })
  it('OLED: versie, aan/uit en een functie om het beeld te lezen; zonder voeding is het zwart', () => {
    const s = new HardwareState()
    s.setDisplay(new Uint8Array(1024).fill(255))
    const parts = [part({ id: 'o', kind: 'oled', connections: full.oled })]
    const live = snapshot(s, parts, {}).o
    expect(live.display).toMatchObject({ on: true })
    expect(live.display!.version).toBe(s.displayVersion())
    expect(live.readDisplay!()[0]).toBe(255)
    const { v33: _v, ...noPower } = full.oled
    expect(snapshot(s, [part({ id: 'o', kind: 'oled', connections: noPower })], {}).o.display).toMatchObject({ on: false })
  })
  it('de momentopname is zonder functies vergelijkbaar met JSON (voor useHardwareFrame)', () => {
    const s = new HardwareState()
    const snap = snapshot(s, [part({ id: 'o', kind: 'oled', connections: full.oled })], {})
    expect(JSON.stringify(snap).length).toBeLessThan(300)
  })
})
