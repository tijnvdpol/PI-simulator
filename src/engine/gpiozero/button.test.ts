import { beforeEach, describe, expect, it } from 'vitest'
import { createHarness, onPin, type Harness } from '../testing/pythonHarness'

describe('Button', () => {
  let h: Harness
  // knop op fysieke pin 3 = GPIO2, led op fysieke pin 11 = GPIO17
  const press = (t0: number, t1: number) => {
    h.bridge.at(t0, () => h.bridge.state.setButtonPressed(2, true))
    h.bridge.at(t1, () => h.bridge.state.setButtonPressed(2, false))
  }
  beforeEach(async () => { h = await createHarness(); h.bridge.setParts([onPin('button', 3), onPin('led', 11)]) })

  it('is_pressed volgt de knop', async () => {
    press(2, 2.5)
    await h.run('from gpiozero import Button\nimport time\nb = Button(2)\ntime.sleep(1)\nprint(b.is_pressed, b.value)\ntime.sleep(1.2)\nprint(b.is_pressed, b.value)\ntime.sleep(1)\nprint(b.is_pressed)')
    expect(h.stdout).toEqual(['False 0', 'True 1', 'False'])
  })
  it('wait_for_press keert terug bij indrukken', async () => {
    press(2, 2.5)
    await h.run('from gpiozero import Button\nimport _hw\nb = Button(2)\nprint(b.wait_for_press(), _hw.now())')
    const [ok, t] = h.stdout[0].split(' ')
    expect(ok).toBe('True')
    expect(Number(t)).toBeCloseTo(2, 1)
  })
  it('wait_for_press(timeout=1) zonder druk → False na ~1s', async () => {
    await h.run('from gpiozero import Button\nimport _hw\nb = Button(2)\nprint(b.wait_for_press(timeout=1), _hw.now())')
    const [ok, t] = h.stdout[0].split(' ')
    expect(ok).toBe('False')
    expect(Number(t)).toBeCloseTo(1, 1)
  })
  it('wait_for_release keert terug bij loslaten', async () => {
    press(1, 2.5)
    await h.run('from gpiozero import Button\nimport _hw\nb = Button(2)\nb.wait_for_press()\nprint(b.wait_for_release(), _hw.now())')
    expect(Number(h.stdout[0].split(' ')[1])).toBeCloseTo(2.5, 1)
  })
  it('when_pressed = led.toggle + pause() toggelt één keer per indrukken', async () => {
    press(1, 1.5); press(3, 3.5)
    h.bridge.stopAfter(5)
    const r = await h.run('from gpiozero import Button, LED\nfrom signal import pause\nled = LED(17)\nb = Button(2)\nb.when_pressed = led.toggle\npause()')
    expect(r.error?.message).toContain('TestTimeLimit')
    const ev = h.bridge.history(17).slice(1)
    expect(ev.map((e) => e.level)).toEqual([1, 0])
    expect(ev[0].t).toBeCloseTo(1, 1)
    expect(ev[1].t).toBeCloseTo(3, 1)
  })
  it('when_released werkt ook', async () => {
    press(1, 1.5)
    h.bridge.stopAfter(3)
    await h.run('from gpiozero import Button, LED\nfrom signal import pause\nled = LED(17)\nb = Button(2)\nb.when_released = led.on\npause()')
    const ev = h.bridge.history(17).slice(1)
    expect(ev).toHaveLength(1)
    expect(ev[0].t).toBeCloseTo(1.5, 1)
  })
  it('callback met één parameter krijgt het Button-object', async () => {
    press(1, 1.5)
    h.bridge.stopAfter(3)
    await h.run('from gpiozero import Button\nfrom signal import pause\ndef cb(btn):\n    print("cb", type(btn).__name__)\nb = Button(2)\nb.when_pressed = cb\npause()')
    expect(h.stdout).toContain('cb Button')
  })
  it('een fout in een callback bereikt de gebruiker', async () => {
    press(1, 1.5)
    h.bridge.stopAfter(3)
    const r = await h.run('from gpiozero import Button\nfrom signal import pause\ndef cb():\n    raise RuntimeError("kapot")\nb = Button(2)\nb.when_pressed = cb\npause()')
    expect(r.error?.type).toBe('RuntimeError')
  })
  it('Button zonder onderdeel → pin-unconnected', async () => {
    h.bridge.setParts([])
    await h.run('from gpiozero import Button\nButton(2)')
    expect(h.bridge.warnings).toEqual([{ code: 'pin-unconnected', info: { pin: '2', device: 'Button' } }])
  })
})
