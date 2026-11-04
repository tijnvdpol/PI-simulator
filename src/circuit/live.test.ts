import { beforeEach, describe, expect, it } from 'vitest'
import { createHarness, type Harness } from '../engine/testing/pythonHarness'
import { analyze } from './analyze'
import { effectiveParts, inputsFromHardware, syncHardware } from './live'
import type { Circuit, ProWire } from './types'

let n = 0
const w = (a: string, b: string): ProWire => ({ id: `w${n++}`, a, b, color: 'blue' })

const ledCircuit = (): Circuit => ({
  parts: [
    { id: 'r', kind: 'resistor', col: 5, row: 0, rot: 0, resistance: 330 },
    { id: 'led', kind: 'led', col: 9, row: 1, rot: 0, color: 'red' },
  ],
  wires: [w('pin:11', 'h:b5'), w('h:c10', 'pin:6')],
})
const buttonCircuit = (to: string): Circuit => ({
  parts: [{ id: 'b', kind: 'button', col: 10, row: 4, rot: 0 }],
  wires: [w('pin:13', 'h:a10'), w(to, 'h:j10')],
})

describe('pro-schakeling met de echte nep-gpiozero', () => {
  let h: Harness
  beforeEach(async () => { h = await createHarness() })
  const frame = (c: Circuit, pressed: Record<string, boolean> = {}, sensors: Record<string, number> = {}) => {
    const inputs = inputsFromHardware(h.bridge.state, { pressed, sensors })
    const result = analyze(c, inputs)
    h.bridge.state.setParts(effectiveParts(result))
    syncHardware(h.bridge.state, result, inputs)
    return result
  }
  const isTimeLimit = (r: Awaited<ReturnType<Harness['run']>>) => expect(r.error?.message).toContain('TestTimeLimit')

  it('LED(17) achter een weerstand: geen waarschuwing en de led brandt', async () => {
    const c = ledCircuit()
    frame(c)
    h.bridge.at(0.5, () => { expect(frame(c).parts.led.status).toBe('on') })
    h.bridge.stopAfter(1)
    isTimeLimit(await h.run('from gpiozero import LED\nfrom time import sleep\nled = LED(17)\nled.on()\nsleep(2)'))
    expect(h.bridge.warnings).toEqual([])
    expect(frame(c).parts.led.status).toBe('on')
  })

  it('een led op de verkeerde pin geeft nog steeds de bekende waarschuwing', async () => {
    const c = ledCircuit()
    frame(c)
    await h.run('from gpiozero import LED\nLED(22).on()')
    expect(h.bridge.warnings.map((x) => x.code)).toEqual(['pin-unconnected'])
  })

  it('knop met pull-up naar GND: ingedrukt = laag niveau', async () => {
    const c = buttonCircuit('pin:6')
    frame(c)
    h.bridge.at(0.1, () => frame(c, { b: false }))
    h.bridge.at(0.8, () => frame(c, { b: true }))
    h.bridge.stopAfter(3)
    isTimeLimit(await h.run('from gpiozero import Button\nfrom time import sleep\nb = Button(27)\nsleep(0.5)\nprint(b.is_pressed)\nsleep(1)\nprint(b.is_pressed)\nsleep(5)'))
    expect(h.stdout.slice(0, 2)).toEqual(['False', 'True'])
    expect(h.bridge.warnings).toEqual([])
  })

  it('knop met pull_up=False naar 3V3: ingedrukt = hoog niveau', async () => {
    const c = buttonCircuit('pin:1')
    frame(c)
    h.bridge.at(0.1, () => frame(c, { b: false }))
    h.bridge.at(0.8, () => frame(c, { b: true }))
    h.bridge.stopAfter(3)
    isTimeLimit(await h.run('from gpiozero import Button\nfrom time import sleep\nb = Button(27, pull_up=False)\nsleep(0.5)\nprint(b.is_pressed)\nsleep(1)\nprint(b.is_pressed)\nsleep(5)'))
    expect(h.stdout.slice(0, 2)).toEqual(['False', 'True'])
  })

  it('verkeerde combinatie (pull-up in code, knop naar 3V3): de knop merkt nooit iets', async () => {
    const c = buttonCircuit('pin:1')
    frame(c)
    h.bridge.at(0.1, () => frame(c, { b: false }))
    h.bridge.at(0.8, () => frame(c, { b: true }))
    h.bridge.stopAfter(3)
    isTimeLimit(await h.run('from gpiozero import Button\nfrom time import sleep\nb = Button(27)\nsleep(0.5)\nprint(b.is_pressed)\nsleep(1)\nprint(b.is_pressed)\nsleep(5)'))
    expect(h.stdout.slice(0, 2)).toEqual(['False', 'False'])
  })

  it('temperatuursensor met stroom levert een waarde aan MCP3008', async () => {
    const c: Circuit = {
      parts: [{ id: 't', kind: 'temperature', col: 8, row: 0, rot: 0 }],
      wires: [w('pin:1', 'h:b8'), w('adc:0', 'h:b9'), w('pin:6', 'h:b10')],
    }
    frame(c, {}, { t: 30 })
    await h.run('from gpiozero import MCP3008\nadc = MCP3008(channel=0)\nprint(round((adc.voltage - 0.5) * 100))')
    expect(h.stdout[0]).toBe('30')
    expect(h.bridge.warnings).toEqual([])
  })
})
