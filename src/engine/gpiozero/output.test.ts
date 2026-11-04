import { beforeEach, describe, expect, it } from 'vitest'
import { createHarness, onPin, type Harness } from '../testing/pythonHarness'

const ledOn17 = () => [onPin('led', 11)]

describe('LED', () => {
  let h: Harness
  beforeEach(async () => { h = await createHarness(); h.bridge.setParts(ledOn17()) })
  const levels = () => h.bridge.history(17).map((e) => e.level)
  const after = (t0: number) => h.bridge.history(17).filter((e) => e.t >= t0 - 1e-6)

  it('on / off / toggle / is_lit', async () => {
    await h.run('from gpiozero import LED\nled = LED(17)\nled.on()\nprint(led.is_lit, led.value)\nled.off()\nprint(led.is_lit)\nled.toggle()\nprint(led.is_lit)')
    expect(h.stdout).toEqual(['True 1', 'False', 'True'])
    expect(h.bridge.last(17)).toBe(1)
    expect(levels().slice(-3)).toEqual([1, 0, 1])
  })
  it('initial_value=True zet de led direct aan', async () => {
    await h.run('from gpiozero import LED\nLED(17, initial_value=True)')
    expect(h.bridge.last(17)).toBe(1)
  })
  it('blink(0.5, 0.5) knippert op de juiste momenten en keert direct terug', async () => {
    const r = await h.run('from gpiozero import LED\nimport time\nled = LED(17)\nled.blink(0.5, 0.5)\nassert time.monotonic() >= 0\nprint("terug")\ntime.sleep(2)')
    expect(r.error).toBeNull()
    expect(h.stdout).toContain('terug')
    const ev = after(0).filter((e) => e.t < 1.99).slice(-4)
    expect(ev.map((e) => e.level)).toEqual([1, 0, 1, 0])
    ev.forEach((e, i) => expect(e.t).toBeCloseTo(i * 0.5, 1))
  })
  it('blink(n=2) stopt na twee keer', async () => {
    await h.run('from gpiozero import LED\nimport time\nled = LED(17)\nled.blink(0.1, 0.1, n=2)\ntime.sleep(5)')
    expect(levels().slice(-4)).toEqual([1, 0, 1, 0])
    expect(h.bridge.history(17)).toHaveLength(5) // 1× begin-waarde + 4 wisselingen
  })
  it('blink(background=False, n=1) blokkeert 1+1 seconde', async () => {
    await h.run('from gpiozero import LED\nLED(17).blink(background=False, n=1)')
    expect(h.bridge.t).toBeCloseTo(2, 1)
  })
  it('on() na blink() stopt het knipperen', async () => {
    await h.run('from gpiozero import LED\nimport time\nled = LED(17)\nled.blink(0.2, 0.2)\ntime.sleep(0.5)\nled.on()\ntime.sleep(2)')
    expect(h.bridge.last(17)).toBe(1)
    expect(after(0.6)).toHaveLength(0)
  })
  it('close() zet de uitgang uit', async () => {
    await h.run('from gpiozero import LED\nled = LED(17)\nled.on()\nled.close()')
    expect(h.bridge.last(17)).toBe(0)
  })
  it('value is te schrijven', async () => {
    await h.run('from gpiozero import LED\nled = LED(17)\nled.value = 1')
    expect(h.bridge.last(17)).toBe(1)
  })
  it('accepteert "GPIO17" en BOARD11', async () => {
    expect((await h.run('from gpiozero import LED\nLED("GPIO17")')).error).toBeNull()
    expect((await h.run('from gpiozero import LED\nLED("BOARD11")')).error).toBeNull()
    expect(h.bridge.warnings).toHaveLength(0)
  })
})

describe('LED zonder of met verkeerd onderdeel', () => {
  let h: Harness
  beforeEach(async () => { h = await createHarness() })

  it('geen onderdeel → exact één pin-unconnected, geen exception', async () => {
    const r = await h.run('from gpiozero import LED\nled = LED(17)\nled.on()')
    expect(r.error).toBeNull()
    expect(h.bridge.warnings).toEqual([{ code: 'pin-unconnected', info: { pin: '17', device: 'LED' } }])
  })
  it('knop op die pin → pin-wrong-kind met found', async () => {
    h.bridge.setParts([onPin('button', 11)])
    await h.run('from gpiozero import LED\nLED(17)')
    expect(h.bridge.warnings).toEqual([{ code: 'pin-wrong-kind', info: { pin: '17', device: 'LED', found: 'button' } }])
  })
})

describe('Buzzer', () => {
  let h: Harness
  beforeEach(async () => { h = await createHarness(); h.bridge.setParts([onPin('buzzer', 15)]) })

  it('on / off / is_active', async () => {
    await h.run('from gpiozero import Buzzer\nb = Buzzer(22)\nb.on()\nprint(b.is_active)\nb.off()\nprint(b.is_active)')
    expect(h.stdout).toEqual(['True', 'False'])
    expect(h.bridge.last(22)).toBe(0)
  })
  it('beep(0.2, 0.2) piept in de achtergrond', async () => {
    await h.run('from gpiozero import Buzzer\nimport time\nb = Buzzer(22)\nb.beep(0.2, 0.2)\ntime.sleep(0.9)')
    const ev = h.bridge.history(22).slice(1, 5)
    expect(ev.map((e) => e.level)).toEqual([1, 0, 1, 0])
    expect(ev[2].t).toBeCloseTo(0.4, 1)
  })
  it('zonder onderdeel waarschuwt hij met device Buzzer', async () => {
    h.bridge.setParts([])
    await h.run('from gpiozero import Buzzer\nBuzzer(22)')
    expect(h.bridge.warnings[0]).toEqual({ code: 'pin-unconnected', info: { pin: '22', device: 'Buzzer' } })
  })
})
