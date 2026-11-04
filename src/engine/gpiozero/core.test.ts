import { beforeEach, describe, expect, it } from 'vitest'
import { createHarness, type Harness } from '../testing/pythonHarness'

describe('nep-gpiozero kern', () => {
  let h: Harness
  beforeEach(async () => { h = await createHarness() })

  it('time.sleep(2) verhoogt de virtuele klok met 2 seconden', async () => {
    expect(await h.run('import time\ntime.sleep(2)')).toEqual({ error: null })
    expect(h.bridge.t).toBeCloseTo(2, 1)
  })
  it('from signal import pause werkt', async () => {
    expect(await h.run('from signal import pause')).toEqual({ error: null })
  })
  it('scheduler draait een timer tijdens sleep op het juiste moment', async () => {
    await h.run('import time, _hw\nfrom gpiozero import _scheduler\n_scheduler.after(1.5, lambda: print("HIT", _hw.now()))\ntime.sleep(2)')
    const hit = h.stdout.find((l) => l.startsWith('HIT'))!
    expect(Number(hit.split(' ')[1])).toBeCloseTo(1.5, 1)
  })
  it('negatieve sleep geeft ValueError zoals echt', async () => {
    expect((await h.run('import time\ntime.sleep(-1)')).error?.type).toBe('ValueError')
  })
  it('parse_pin kent int, GPIO-tekst en BOARD-tekst', async () => {
    await h.run('from gpiozero._pins import parse_pin\nprint(parse_pin(17), parse_pin("GPIO17"), parse_pin("17"), parse_pin("BOARD11"))')
    expect(h.stdout).toContain('17 17 17 17')
  })
  it('Review Focus 4: pin buiten bereik of onbekende naam → PinInvalidPin', async () => {
    for (const spec of ['40', '"GPIO99"', '"BOARD2"', '"banaan"', '-1']) {
      expect((await h.run(`from gpiozero._pins import parse_pin\nparse_pin(${spec})`)).error?.type).toBe('PinInvalidPin')
    }
  })
  it('Review Focus 4: dezelfde pin twee keer → GPIOPinInUse', async () => {
    const r = await h.run('from gpiozero.devices import Device\nDevice(17)\nDevice("GPIO17")')
    expect(r.error?.type).toBe('GPIOPinInUse')
    expect(r.error?.message).toContain('already in use')
  })
  it('close() geeft de pin vrij', async () => {
    expect(await h.run('from gpiozero.devices import Device\nd = Device(17)\nd.close()\nassert d.closed\nDevice(17)')).toEqual({ error: null })
  })
  it('een lus met sleep blokkeert de scheduler niet (stopAfter)', async () => {
    h.bridge.stopAfter(1)
    const r = await h.run('import time\nwhile True:\n    time.sleep(0.1)')
    expect(r.error?.message).toContain('TestTimeLimit')
    expect(h.bridge.t).toBeGreaterThan(1)
  })
  it('exceptions zijn ook vanaf gpiozero zelf te importeren', async () => {
    expect(await h.run('from gpiozero import GPIOZeroError, GPIOPinInUse, PinInvalidPin')).toEqual({ error: null })
  })
})
