import { beforeEach, describe, expect, it } from 'vitest'
import { createHarness, withPins, type Harness } from '../testing/pythonHarness'

// Trigger = pin 16 (GPIO 23), Echo = pin 18 (GPIO 24)
describe('DistanceSensor', () => {
  let h: Harness
  beforeEach(async () => {
    h = await createHarness()
    h.bridge.setParts([withPins('distance', { trigger: 16, echo: 18, v5: 4, gnd: 14 })])
    h.bridge.state.setDistanceCm(24, 50)
  })
  const run = (body: string, args = '') => h.run(`from gpiozero import DistanceSensor\nfrom time import sleep\nd = DistanceSensor(echo=24, trigger=23${args})\n${body}`)

  it('distance in meters en value tussen 0 en 1', async () => {
    await run('print(d.distance, d.value)')
    expect(h.stdout).toEqual(['0.5 0.5'])
  })
  it('verder dan max_distance geeft max_distance (zoals de echte sensor)', async () => {
    h.bridge.state.setDistanceCm(24, 250)
    await run('print(d.distance, d.value)')
    expect(h.stdout).toEqual(['1.0 1.0'])
    h.stdout.length = 0
    await run('print(d.distance, round(d.value, 3))', ', max_distance=4')
    expect(h.stdout).toEqual(['2.5 0.625'])
  })
  it('de afstand volgt het schuifje tijdens sleep()', async () => {
    h.bridge.at(1, () => h.bridge.state.setDistanceCm(24, 10))
    await run('print(d.distance)\nsleep(1.5)\nprint(d.distance)')
    expect(h.stdout).toEqual(['0.5', '0.1'])
  })
  it('hele bereik 2–400 cm', async () => {
    h.bridge.state.setDistanceCm(24, 2)
    await run('print(d.distance)', ', max_distance=4')
    h.bridge.state.setDistanceCm(24, 400)
    await run('print(d.distance)', ', max_distance=4')
    expect(h.stdout).toEqual(['0.02', '4.0'])
  })
  it('in_range gebruikt threshold_distance (standaard 0,3 m)', async () => {
    h.bridge.state.setDistanceCm(24, 20)
    await run('print(d.in_range, d.threshold_distance)')
    h.bridge.state.setDistanceCm(24, 40)
    await run('print(d.in_range)')
    expect(h.stdout).toEqual(['True 0.3', 'False'])
  })
  it('threshold_distance en max_distance zijn aan te passen', async () => {
    await run('d.threshold_distance = 0.6\nprint(d.in_range)\nd.max_distance = 2\nprint(d.max_distance, d.value)')
    expect(h.stdout).toEqual(['True', '2 0.25'])
  })
  it('when_in_range / when_out_of_range worden tijdens sleep aangeroepen', async () => {
    h.bridge.at(1, () => h.bridge.state.setDistanceCm(24, 10))
    h.bridge.at(2, () => h.bridge.state.setDistanceCm(24, 80))
    await run('d.when_in_range = lambda: print("dichtbij")\nd.when_out_of_range = lambda: print("ver weg")\nsleep(3)')
    expect(h.stdout).toEqual(['dichtbij', 'ver weg'])
  })
  it('wait_for_in_range wacht tot het zover is; met timeout geeft het False', async () => {
    h.bridge.at(1, () => h.bridge.state.setDistanceCm(24, 10))
    await run('print(d.wait_for_in_range())\nprint(round(d.distance, 2))')
    expect(h.stdout).toEqual(['True', '0.1'])
    expect(h.bridge.t).toBeGreaterThanOrEqual(1)
    h.stdout.length = 0
    h.bridge.state.setDistanceCm(24, 90)
    await run('print(d.wait_for_in_range(timeout=0.5))')
    expect(h.stdout).toEqual(['False'])
  })
  it('geen echo (0 cm, bijv. zonder voeding) → maximale afstand', async () => {
    h.bridge.state.setDistanceCm(24, 0)
    await run('print(d.distance)')
    expect(h.stdout).toEqual(['1.0'])
  })
  it('echo en trigger moeten allebei een pin hebben', async () => {
    const r = await h.run('from gpiozero import DistanceSensor\nDistanceSensor(echo=24)')
    expect(r.error?.type).toBe('GPIOPinMissing')
  })
  it('max_distance moet positief zijn', async () => {
    expect((await run('', ', max_distance=0')).error?.type).toBe('ValueError')
  })
  it('geen onderdeel op de pinnen → pin-unconnected voor echo én trigger', async () => {
    h.bridge.setParts([])
    await run('')
    expect(h.bridge.warnings.map((w) => w.info.pin).sort()).toEqual(['23', '24'])
    expect(h.bridge.warnings.every((w) => w.code === 'pin-unconnected' && w.info.device === 'DistanceSensor')).toBe(true)
  })
  it('close() geeft beide pinnen vrij en daarna is de sensor gesloten', async () => {
    const r = await run('d.close()\nprint(d.distance)')
    expect(r.error?.type).toBe('DeviceClosed')
    expect((await run('')).error).toBeNull()
  })
  it('parkeersensor-patroon: piept sneller als het object dichterbij komt', async () => {
    h.bridge.setParts([withPins('distance', { trigger: 16, echo: 18, v5: 4, gnd: 14 })])
    expect((await run('print(d.distance * 100)')).error).toBeNull()
  })
})
