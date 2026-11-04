import { beforeEach, describe, expect, it } from 'vitest'
import { createHarness, withPins, type Harness } from '../testing/pythonHarness'

// Signaal = pin 12 (GPIO 18)
describe('Servo', () => {
  let h: Harness
  beforeEach(async () => { h = await createHarness(); h.bridge.setParts([withPins('servo', { signal: 12, v5: 2, gnd: 6 })]) })
  const pos = () => h.bridge.state.getServo(18)
  const run = (body: string) => h.run(`from gpiozero import Servo\nfrom time import sleep\ns = Servo(18)\n${body}`)

  it('begint in het midden (value 0 → stand 0,5)', async () => {
    await run('print(s.value, s.is_active)')
    expect(h.stdout).toEqual(['0.0 True'])
    expect(pos()).toBeCloseTo(0.5, 3)
  })
  it('value −1 … 1 loopt over de hele draaihoek', async () => {
    await run('s.value = -1')
    expect(pos()).toBe(0)
    await run('s.value = 1')
    expect(pos()).toBe(1)
    await run('s.value = 0.5')
    expect(pos()).toBeCloseTo(0.75, 3)
  })
  it('min() / mid() / max()', async () => {
    await run('s.min()')
    expect(pos()).toBe(0)
    await run('s.max()')
    expect(pos()).toBe(1)
    await run('s.max()\ns.mid()')
    expect(pos()).toBeCloseTo(0.5, 3)
  })
  it('detach() en value = None ontkoppelen de servo', async () => {
    await run('s.detach()\nprint(s.value, s.is_active)')
    expect(h.stdout).toEqual(['None False'])
    expect(pos()).toBeNull()
    await run('s.value = 1\ns.value = None')
    expect(pos()).toBeNull()
  })
  it('initial_value=None begint ontkoppeld; initial_value=1 begint rechts', async () => {
    await h.run('from gpiozero import Servo\nServo(18, initial_value=None)')
    expect(pos()).toBeNull()
    await h.run('from gpiozero import Servo\nServo(18, initial_value=1)')
    expect(pos()).toBe(1)
  })
  it('value buiten −1…1 → ValueError met uitleg', async () => {
    const r = await run('s.value = 2')
    expect(r.error?.type).toBe('OutputDeviceBadValue')
    expect(r.error?.message).toContain('between -1 and 1')
  })
  it('pulsbreedtes die niet kloppen → ValueError', async () => {
    expect((await h.run('from gpiozero import Servo\nServo(18, min_pulse_width=0.003, max_pulse_width=0.002)')).error?.type).toBe('ValueError')
    expect((await h.run('from gpiozero import Servo\nServo(18, max_pulse_width=0.05)')).error?.type).toBe('ValueError')
  })
  it('veegbeweging: elke stap komt in de geschiedenis', async () => {
    await run('for i in range(5):\n    s.value = -1 + i / 2\n    sleep(0.2)')
    expect(h.bridge.servoHistory(18).slice(-5).map((e) => e.position)).toEqual([0, 0.25, 0.5, 0.75, 1])
  })
  it('close() ontkoppelt en geeft de pin vrij', async () => {
    await run('s.close()\nServo(18)')
    expect(pos()).toBeCloseTo(0.5, 3)
  })
  it('geen onderdeel / ander onderdeel op de pin → waarschuwing', async () => {
    h.bridge.setParts([])
    await h.run('from gpiozero import Servo\nServo(18)')
    expect(h.bridge.warnings[0]).toMatchObject({ code: 'pin-unconnected', info: { pin: '18', device: 'Servo' } })
  })
})

describe('AngularServo', () => {
  let h: Harness
  beforeEach(async () => { h = await createHarness(); h.bridge.setParts([withPins('servo', { signal: 12, v5: 2, gnd: 6 })]) })
  const pos = () => h.bridge.state.getServo(18)
  const run = (body: string, args = '') => h.run(`from gpiozero import AngularServo\nfrom time import sleep\ns = AngularServo(18${args})\n${body}`)

  it('standaard −90…90: 0° is het midden', async () => {
    await run('print(s.angle)')
    expect(h.stdout).toEqual(['0.0'])
    expect(pos()).toBeCloseTo(0.5, 3)
  })
  it('angle = 90 en −90 zijn de uiteinden', async () => {
    await run('s.angle = 90')
    expect(pos()).toBe(1)
    await run('s.angle = -90')
    expect(pos()).toBe(0)
  })
  it('min_angle=0, max_angle=180: 45° is een kwart', async () => {
    await run('s.angle = 45\nprint(s.angle, s.value)', ', min_angle=0, max_angle=180, initial_angle=90')
    expect(pos()).toBeCloseTo(0.25, 3)
    expect(h.stdout).toEqual(['45.0 -0.5'])
  })
  it('min() / mid() / max() gebruiken de hoeken', async () => {
    await run('s.max()\nprint(s.angle)\ns.min()\nprint(s.angle)\ns.mid()\nprint(s.angle)', ', min_angle=0, max_angle=180, initial_angle=0')
    expect(h.stdout).toEqual(['180.0', '0.0', '90.0'])
  })
  it('hoek buiten het bereik → ValueError', async () => {
    const r = await run('s.angle = 120', ', min_angle=0, max_angle=90, initial_angle=0')
    expect(r.error?.type).toBe('OutputDeviceBadValue')
    expect(r.error?.message).toContain('between 0 and 90')
  })
  it('initial_angle buiten het bereik → ValueError', async () => {
    expect((await run('', ', min_angle=10, max_angle=100')).error?.type).toBe('OutputDeviceBadValue')
  })
  it('angle = None ontkoppelt', async () => {
    await run('s.angle = None\nprint(s.angle)')
    expect(pos()).toBeNull()
    expect(h.stdout).toEqual(['None'])
  })
  it('wijzer-voorbeeld: potmeterwaarde 0…1 naar 0…180°', async () => {
    await run('for v in (0, 0.5, 1):\n    s.angle = v * 180\n    sleep(0.1)', ', min_angle=0, max_angle=180, initial_angle=0')
    expect(h.bridge.servoHistory(18).slice(-3).map((e) => e.position)).toEqual([0, 0.5, 1])
  })
})
