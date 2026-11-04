import { beforeEach, describe, expect, it } from 'vitest'
import { createHarness, onChannel, onPin, type Harness } from '../testing/pythonHarness'

describe('nep-gpiozero: kleine verschillen met de echte bibliotheek', () => {
  let h: Harness
  beforeEach(async () => { h = await createHarness(); h.bridge.setParts([onPin('led', 11), onPin('button', 13), onChannel('potentiometer', 0)]) })

  it('LED(), Button() en Buzzer() zonder pin geven GPIODeviceError', async () => {
    for (const cls of ['LED', 'Button', 'Buzzer']) {
      expect((await h.run(`from gpiozero import ${cls}\n${cls}()`)).error?.type).toBe('GPIODeviceError')
    }
  })
  it('een gesloten LED/Button/MCP3008 geeft DeviceClosed', async () => {
    expect((await h.run('from gpiozero import LED\nl = LED(17)\nl.close()\nl.on()')).error?.type).toBe('DeviceClosed')
    expect((await h.run('from gpiozero import Button\nb = Button(27)\nb.close()\nb.is_pressed')).error?.type).toBe('DeviceClosed')
    expect((await h.run('from gpiozero import MCP3008\nm = MCP3008(0)\nm.close()\nm.value')).error?.type).toBe('DeviceClosed')
  })
  it('close() zelf mag vaker aangeroepen worden', async () => {
    expect((await h.run('from gpiozero import LED\nl = LED(17)\nl.close()\nl.close()')).error).toBeNull()
  })
  it('"BCM17", "J8:11" en pin_factory= worden geaccepteerd', async () => {
    await h.run('from gpiozero._pins import parse_pin\nprint(parse_pin("BCM17"), parse_pin("J8:11"), parse_pin("gpio17"))')
    expect(h.stdout).toContain('17 17 17')
    expect((await h.run('from gpiozero import LED\nLED(17, pin_factory=None)')).error).toBeNull()
  })
  it('print zonder newline aan het eind komt toch in de uitvoer', async () => {
    await h.run('print("x", end="")')
    expect(h.stdout).toContain('x')
    await h.run('print("a")\nprint("b", end="")')
    expect(h.stdout.slice(-2)).toEqual(['a', 'b'])
  })
})
