import { beforeEach, describe, expect, it } from 'vitest'
import { createHarness, withPins, type Harness } from '../testing/pythonHarness'

// R = pin 11 (GPIO 17), G = pin 13 (GPIO 27), B = pin 15 (GPIO 22)
describe('RGBLED', () => {
  let h: Harness
  beforeEach(async () => { h = await createHarness(); h.bridge.setParts([withPins('rgbled', { r: 11, g: 13, b: 15, gnd: 14 })]) })
  const run = (body: string) => h.run(`from gpiozero import RGBLED\nfrom time import sleep\nled = RGBLED(17, 27, 22)\n${body}`)
  const rgb = () => [17, 27, 22].map((g) => Math.round(h.bridge.last(g) * 1000) / 1000)

  it('color = (1, 0, 0) zet de R-pin vol aan en de rest uit', async () => {
    await run('led.color = (1, 0, 0)')
    expect(rgb()).toEqual([1, 0, 0])
  })
  it('mengkleuren: elke component apart', async () => {
    await run('led.color = (0.2, 0.5, 1)\nprint(led.color)')
    expect(rgb()).toEqual([0.2, 0.5, 1])
    expect(h.stdout).toEqual(['Color(red=0.2, green=0.5, blue=1.0)'])
  })
  it('de kleur is een tuple dat je kunt uitpakken', async () => {
    await run('r, g, b = led.color\nprint(r, g, b)\nprint(led.value == led.color)')
    expect(h.stdout).toEqual(['0.0 0.0 0.0', 'True'])
  })
  it('red / green / blue los instellen', async () => {
    await run('led.red = 1\nled.blue = 0.5')
    expect(rgb()).toEqual([1, 0, 0.5])
  })
  it('on / off / is_lit', async () => {
    await run('led.on()\nprint(led.is_lit)')
    expect(rgb()).toEqual([1, 1, 1])
    await run('led.on()\nled.off()\nprint(led.is_lit)')
    expect(rgb()).toEqual([0, 0, 0])
    expect(h.stdout.at(-1)).toBe('False')
  })
  it('toggle: uit wordt wit, anders keert de kleur om', async () => {
    await run('led.toggle()')
    expect(rgb()).toEqual([1, 1, 1])
    await run('led.color = (1, 0, 0)\nled.toggle()')
    expect(rgb()).toEqual([0, 1, 1])
  })
  it('initial_value', async () => {
    await h.run('from gpiozero import RGBLED\nRGBLED(17, 27, 22, initial_value=(0, 1, 0))')
    expect(rgb()).toEqual([0, 1, 0])
  })
  it('component buiten 0–1 → ValueError', async () => {
    const r = await run('led.color = (1.5, 0, 0)')
    expect(r.error?.type).toBe('OutputDeviceBadValue')
    expect((await run('led.color = (1, 0)')).error?.type).toMatch(/ValueError|TypeError|OutputDeviceBadValue/)
  })
  it('pwm=False: alleen 0 of 1', async () => {
    await h.run('from gpiozero import RGBLED\nled = RGBLED(17, 27, 22, pwm=False)\nled.color = (1, 0, 1)')
    expect(rgb()).toEqual([1, 0, 1])
    const r = await h.run('from gpiozero import RGBLED\nled = RGBLED(17, 27, 22, pwm=False)\nled.color = (0.5, 0, 0)')
    expect(r.error?.type).toBe('OutputDeviceBadValue')
  })
  it('een pin ontbreekt → GPIOPinMissing', async () => {
    const r = await h.run('from gpiozero import RGBLED\nRGBLED(17, 27)')
    expect(r.error?.type).toBe('GPIOPinMissing')
  })
  it('dubbele pin → GPIOPinInUse en de al geclaimde pinnen komen weer vrij', async () => {
    expect((await h.run('from gpiozero import RGBLED\nRGBLED(17, 17, 22)')).error?.type).toBe('GPIOPinInUse')
    expect((await h.run('from gpiozero import RGBLED\nRGBLED(17, 27, 22)')).error).toBeNull()
  })
  it('blink(on_color, off_color): wisselt tussen twee kleuren', async () => {
    await run('led.blink(0.5, 0.5, on_color=(1, 0, 0), off_color=(0, 0, 1), n=2)\nsleep(3)')
    const colorAt = (t: number) => [17, 27, 22].map((g) => h.bridge.history(g).filter((e) => e.t <= t + 1e-6).at(-1)!.level)
    expect(colorAt(0.25)).toEqual([1, 0, 0])
    expect(colorAt(0.75)).toEqual([0, 0, 1])
    expect(colorAt(1.25)).toEqual([1, 0, 0])
    expect(colorAt(2.5)).toEqual([0, 0, 1])
  })
  it('pulse: rood fade in en uit', async () => {
    await run('led.pulse(1, 1, on_color=(1, 0, 0), off_color=(0, 0, 0), n=1, background=False)')
    expect(h.bridge.t).toBeCloseTo(2, 1)
    const r = h.bridge.history(17)
    expect(Math.max(...r.map((e) => e.level))).toBeGreaterThan(0.95)
    expect(h.bridge.history(27).every((e) => e.level === 0)).toBe(true)
  })
  it('pulse met pwm=False → ValueError', async () => {
    const r = await h.run('from gpiozero import RGBLED\nRGBLED(17, 27, 22, pwm=False).pulse()')
    expect(r.error?.type).toBe('ValueError')
  })
  it('close() zet alles uit', async () => {
    await run('led.color = (1, 1, 1)\nled.close()')
    expect(rgb()).toEqual([0, 0, 0])
  })
  it('geen onderdeel op een kleurpin → pin-unconnected per pin', async () => {
    h.bridge.setParts([])
    await h.run('from gpiozero import RGBLED\nRGBLED(17, 27, 22)')
    expect(h.bridge.warnings.map((w) => w.info.pin).sort()).toEqual(['17', '22', '27'])
    expect(h.bridge.warnings.every((w) => w.code === 'pin-unconnected' && w.info.device === 'RGBLED')).toBe(true)
  })
})
