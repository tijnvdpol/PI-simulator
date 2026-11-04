import { beforeEach, describe, expect, it } from 'vitest'
import { createHarness, onPin, type Harness } from '../testing/pythonHarness'

// Pin 12 = GPIO 18 (hardware-PWM)
describe('PWMLED', () => {
  let h: Harness
  beforeEach(async () => { h = await createHarness(); h.bridge.setParts([onPin('pwmled', 12)]) })
  const run = (body: string) => h.run(`from gpiozero import PWMLED\nfrom time import sleep\nled = PWMLED(18)\n${body}`)

  it('begint uit; value schrijft de helderheid 0–1 naar de uitgang en leest hem terug', async () => {
    await run('print(led.value)\nled.value = 0.5\nprint(led.value)')
    expect(h.stdout).toEqual(['0.0', '0.5'])
    expect(h.bridge.last(18)).toBeCloseTo(0.5, 3)
  })
  it('on / off / toggle / is_lit / is_active', async () => {
    await run('led.on()\nprint(led.value, led.is_lit)\nled.off()\nprint(led.value, led.is_lit)\nled.value = 0.3\nled.toggle()\nprint(round(led.value, 2), led.is_active)')
    expect(h.stdout).toEqual(['1.0 True', '0.0 False', '0.7 True'])
  })
  it('initial_value', async () => {
    await h.run('from gpiozero import PWMLED\nPWMLED(18, initial_value=0.25)')
    expect(h.bridge.last(18)).toBeCloseTo(0.25, 3)
  })
  it('waarde buiten 0–1 geeft een ValueError met uitleg', async () => {
    const r = await run('led.value = 1.5')
    expect(r.error?.type).toBe('OutputDeviceBadValue')
    expect(r.error?.message).toContain('between 0 and 1')
    expect((await run('try:\n    led.value = -0.1\nexcept ValueError:\n    print("ok")')).error).toBeNull()
  })
  it('pulse() gaat in 1 s omhoog en in 1 s omlaag, en werkt op de achtergrond', async () => {
    await run('led.pulse()\nprint("terug")\nsleep(2.1)')
    expect(h.stdout).toContain('terug')
    const ev = h.bridge.history(18)
    const at = (t: number) => ev.filter((e) => e.t <= t + 1e-6).at(-1)!.level
    expect(at(0.5)).toBeGreaterThan(0.35); expect(at(0.5)).toBeLessThan(0.65)
    expect(Math.max(...ev.map((e) => e.level))).toBeGreaterThan(0.95)
    expect(at(1.5)).toBeGreaterThan(0.35); expect(at(1.5)).toBeLessThan(0.65)
    // stijgt eerst, daalt daarna
    const up = ev.filter((e) => e.t <= 1).map((e) => e.level)
    expect(up).toEqual([...up].sort((a, b) => a - b))
    const down = ev.filter((e) => e.t >= 1 && e.t <= 2).map((e) => e.level)
    expect(down).toEqual([...down].sort((a, b) => b - a))
  })
  it('pulse(background=False, n=1) blokkeert 2 seconden en eindigt uit', async () => {
    await run('led.pulse(background=False, n=1)')
    expect(h.bridge.t).toBeCloseTo(2, 1)
    expect(h.bridge.last(18)).toBe(0)
  })
  it('pulse(fade_in_time=0.5, fade_out_time=0.5, n=2) stopt vanzelf', async () => {
    await run('led.pulse(0.5, 0.5, n=2)\nsleep(5)')
    expect(h.bridge.last(18)).toBe(0)
    expect(Math.max(...h.bridge.history(18).filter((e) => e.t > 2.1).map((e) => e.level), 0)).toBe(0)
  })
  it('blink met fade: on_time en off_time blijven kloppen', async () => {
    await run('led.blink(on_time=0.5, off_time=0.5, fade_in_time=0, fade_out_time=0, n=2)\nsleep(3)')
    const ev = h.bridge.history(18).slice(1)
    expect(ev.map((e) => e.level)).toEqual([1, 0, 1, 0])
    expect(ev.map((e) => e.t).map((t) => Math.round(t * 10) / 10)).toEqual([0, 0.5, 1, 1.5])
  })
  it('on() na pulse() stopt het pulseren', async () => {
    await run('led.pulse()\nsleep(0.5)\nled.on()\nsleep(3)')
    expect(h.bridge.last(18)).toBe(1)
    expect(h.bridge.history(18).filter((e) => e.t > 0.6)).toHaveLength(0)
  })
  it('close() zet uit en geeft de pin vrij', async () => {
    await run('led.value = 0.8\nled.close()\nled2 = PWMLED(18)')
    expect(h.bridge.last(18)).toBe(0)
  })
  it('dezelfde pin twee keer → GPIOPinInUse', async () => {
    expect((await run('PWMLED(18)')).error?.type).toBe('GPIOPinInUse')
  })
  it('PWMLED op een gewone led → waarschuwing; LED() op een dimbare led mag zonder waarschuwing', async () => {
    h.bridge.setParts([onPin('led', 12)])
    await h.run('from gpiozero import PWMLED\nPWMLED(18)')
    expect(h.bridge.warnings).toEqual([{ code: 'pin-wrong-kind', info: { pin: '18', device: 'PWMLED', found: 'led' } }])
    h.bridge.warnings.length = 0
    h.bridge.setParts([onPin('pwmled', 12)])
    await h.run('from gpiozero import LED\nLED(18).on()')
    expect(h.bridge.warnings).toEqual([])
  })
  it('geen onderdeel op de pin → pin-unconnected', async () => {
    h.bridge.setParts([])
    await h.run('from gpiozero import PWMLED\nPWMLED(18)')
    expect(h.bridge.warnings[0]).toMatchObject({ code: 'pin-unconnected', info: { pin: '18', device: 'PWMLED' } })
  })
})
