import { beforeEach, describe, expect, it } from 'vitest'
import { createHarness, onChannel, type Harness } from '../testing/pythonHarness'

describe('MCP3008', () => {
  let h: Harness
  beforeEach(async () => { h = await createHarness(); h.bridge.setParts([onChannel('potentiometer', 0), onChannel('temperature', 1)]) })

  it('value, raw_value en voltage', async () => {
    h.bridge.state.setAdcRaw(0, 512)
    await h.run('from gpiozero import MCP3008\nm = MCP3008(channel=0)\nprint(round(m.value, 4), m.raw_value, round(m.voltage, 3))')
    expect(h.stdout).toEqual(['0.5005 512 1.652'])
  })
  it('leest veranderingen tijdens sleep', async () => {
    h.bridge.at(1, () => h.bridge.state.setAdcRaw(0, 1023))
    await h.run('from gpiozero import MCP3008\nimport time\nm = MCP3008(0)\nprint(m.value)\ntime.sleep(1.5)\nprint(m.value)')
    expect(h.stdout).toEqual(['0.0', '1.0'])
  })
  it('kanaal buiten 0–7 → SPIBadChannel', async () => {
    expect((await h.run('from gpiozero import MCP3008\nMCP3008(channel=8)')).error?.type).toBe('SPIBadChannel')
  })
  it('geen onderdeel op het kanaal → pin-unconnected met CH', async () => {
    await h.run('from gpiozero import MCP3008\nMCP3008(channel=5)')
    expect(h.bridge.warnings).toEqual([{ code: 'pin-unconnected', info: { pin: 'CH5', device: 'MCP3008' } }])
  })
  it('differential=True is niet ondersteund', async () => {
    expect((await h.run('from gpiozero import MCP3008\nMCP3008(0, differential=True)')).error?.type).toBe('NotImplementedError')
  })
  it('temperatuurvoorbeeld: 0,75 V (raw 232) is 25 °C', async () => {
    h.bridge.state.setAdcRaw(1, 232)
    await h.run('from gpiozero import MCP3008\ns = MCP3008(channel=1)\nprint((s.voltage - 0.5) * 100)')
    expect(Number(h.stdout[0])).toBeCloseTo(25, 0)
  })
  it('hetzelfde kanaal twee keer gebruiken mag (zoals bij echte SPI-kanalen niet, hier geen claim)', async () => {
    expect((await h.run('from gpiozero import MCP3008\nMCP3008(0)\nMCP3008(1)')).error).toBeNull()
  })
})
