import { describe, expect, it } from 'vitest'
import { HardwareState, bridgeFromState } from './hardwareState'
import type { Part } from '../project/types'

const part = (over: Partial<Part>): Part => ({ id: 'x', kind: 'led', x: 0, y: 0, connections: {}, ...over })

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
    s.setParts([part({ connections: { signal: { type: 'pin', physical: 11 } } })])
    expect(s.partKindAtGpio(17)).toBe('led')
    expect(s.partKindAtGpio(18)).toBeNull()
  })
  it('potmeter op kanaal 3', () => {
    const s = new HardwareState()
    s.setParts([part({ kind: 'potentiometer', connections: { signal: { type: 'adc', channel: 3 } } })])
    expect(s.partKindAtChannel(3)).toBe('potentiometer')
    expect(s.partKindAtChannel(0)).toBeNull()
  })
  it('onderdeel op voedingspin verschijnt nergens', () => {
    const s = new HardwareState()
    s.setParts([part({ connections: { signal: { type: 'pin', physical: 2 } } })])
    for (let g = 0; g < 28; g++) expect(s.partKindAtGpio(g)).toBeNull()
  })
  it('setParts wist de vorige opstelling', () => {
    const s = new HardwareState()
    s.setParts([part({ connections: { signal: { type: 'pin', physical: 11 } } })])
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

describe('resetButtons', () => {
  it('laat alle knoppen los maar laat uitgangen en ADC staan', () => {
    const s = new HardwareState()
    s.setButtonPressed(2, true); s.setButtonPressed(17, true); s.setOutput(4, 1); s.setAdcRaw(0, 5)
    s.resetButtons()
    expect(s.isButtonPressed(2)).toBe(false)
    expect(s.isButtonPressed(17)).toBe(false)
    expect(s.getOutput(4)).toBe(1)
    expect(s.getAdcRaw(0)).toBe(5)
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

const pin = (physical: number) => ({ type: 'pin' as const, physical })
const oled = (over: Record<string, ReturnType<typeof pin>> = {}) =>
  part({ id: 'o', kind: 'oled', connections: { sda: pin(3), scl: pin(5), v33: pin(1), gnd: pin(6), ...over } })

describe('HardwareState: meerdere aansluitingen en nieuwe gebieden', () => {
  it('RGB-led: elk van de drie kleurpinnen krijgt de onderdeelsoort', () => {
    const s = new HardwareState()
    s.setParts([part({ kind: 'rgbled', connections: { r: pin(11), g: pin(13), b: pin(15), gnd: pin(14) } })])
    expect([17, 27, 22].map((g) => s.partKindAtGpio(g))).toEqual(['rgbled', 'rgbled', 'rgbled'])
  })
  it('afstandssensor: trigger en echo staan allebei op de kaart', () => {
    const s = new HardwareState()
    s.setParts([part({ kind: 'distance', connections: { trigger: pin(16), echo: pin(18), v5: pin(2), gnd: pin(6) } })])
    expect(s.partKindAtGpio(23)).toBe('distance')
    expect(s.partKindAtGpio(24)).toBe('distance')
  })
  it('afstand: centimeters per echo-pin; 0 = geen echo', () => {
    const s = new HardwareState()
    expect(s.getDistanceCm(24)).toBe(0)
    s.setDistanceCm(24, 123.4)
    expect(s.getDistanceCm(24)).toBeCloseTo(123.4, 1)
    s.setDistanceCm(24, 0)
    expect(s.getDistanceCm(24)).toBe(0)
  })
  it('servo: stand 0..1 per pin, null = ontkoppeld (begin)', () => {
    const s = new HardwareState()
    expect(s.getServo(18)).toBeNull()
    s.setServo(18, 0.25)
    expect(s.getServo(18)).toBeCloseTo(0.25, 3)
    s.setServo(18, 0)
    expect(s.getServo(18)).toBe(0)
    s.setServo(18, null)
    expect(s.getServo(18)).toBeNull()
  })
  it('servo-stand buiten 0..1 wordt afgekapt', () => {
    const s = new HardwareState()
    s.setServo(18, 3)
    expect(s.getServo(18)).toBe(1)
  })
  it('OLED is bereikbaar (i2c) als hij compleet op SDA/SCL en voeding zit', () => {
    const s = new HardwareState()
    s.setParts([oled()])
    expect(s.i2cPresent(0x3c)).toBe(true)
    expect(s.i2cPresent(0x3d)).toBe(false)
    expect(s.partKindAtGpio(2)).toBe('oled')
    expect(s.partKindAtGpio(3)).toBe('oled')
  })
  it('OLED zonder voeding, of SDA op de verkeerde pin, is niet bereikbaar', () => {
    const s = new HardwareState()
    s.setParts([oled({ v33: undefined as never })])
    expect(s.i2cPresent(0x3c)).toBe(false)
    s.setParts([oled({ sda: pin(11) })])
    expect(s.i2cPresent(0x3c)).toBe(false)
  })
  it('scherm: 1024 bytes in, dezelfde 1024 bytes uit, en de versie telt op', () => {
    const s = new HardwareState()
    const v0 = s.displayVersion()
    const data = new Uint8Array(1024).map((_, i) => (i * 7) & 255)
    s.setDisplay(data)
    expect(s.displayVersion()).toBe(v0 + 1)
    expect(Array.from(s.getDisplay())).toEqual(Array.from(data))
  })
  it('scherm: verkeerde lengte wordt genegeerd, setParts wist niets, reset maakt het zwart', () => {
    const s = new HardwareState()
    s.setDisplay(new Uint8Array(1024).fill(255))
    s.setDisplay(new Uint8Array(10))
    s.setParts([])
    expect(s.getDisplay()[0]).toBe(255)
    s.resetDisplay()
    expect(s.getDisplay().every((b) => b === 0)).toBe(true)
  })
  it('scherm aan/uit en contrast', () => {
    const s = new HardwareState()
    expect(s.displayOn()).toBe(true)
    s.setDisplayOn(false)
    expect(s.displayOn()).toBe(false)
    s.setContrast(300)
    expect(s.contrast()).toBe(255)
  })
  it('twee views delen scherm en servo', () => {
    const a = new HardwareState(); const b = new HardwareState(a.buffer)
    a.setDisplay(new Uint8Array(1024).fill(1)); a.setServo(12, 0.5)
    expect(b.getDisplay()[5]).toBe(1)
    expect(b.getServo(12)).toBeCloseTo(0.5, 3)
  })
  it('bridge geeft de nieuwe gebieden door', () => {
    const s = new HardwareState()
    const b = bridgeFromState(s, () => {})
    b.writeServo(18, 0.75); b.writeDisplay(new Uint8Array(1024).fill(2)); s.setDistanceCm(24, 50)
    expect(s.getServo(18)).toBeCloseTo(0.75, 3)
    expect(s.getDisplay()[0]).toBe(2)
    expect(b.readDistance(24)).toBeCloseTo(50, 1)
  })
})
