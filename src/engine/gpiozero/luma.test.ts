import { beforeEach, describe, expect, it } from 'vitest'
import { createHarness, withPins, type Harness } from '../testing/pythonHarness'

const OLED = () => withPins('oled', { sda: 3, scl: 5, v33: 1, gnd: 6 })
const SETUP = `from luma.core.interface.serial import i2c
from luma.core.render import canvas
from luma.oled.device import ssd1306
serial = i2c(port=1, address=0x3C)
device = ssd1306(serial)
`

describe('luma.oled (nep) + Pillow', () => {
  let h: Harness
  /** De ssd1306 wist het scherm bij het starten (zoals de echte driver); dat eerste beeld tellen we niet mee. */
  const shown = () => h.bridge.frames.slice(1)
  beforeEach(async () => { h = await createHarness(); h.bridge.setParts([OLED()]) })
  const run = (body: string) => h.run(SETUP + body)

  it('apparaateigenschappen van een ssd1306 128×64', async () => {
    await run('print(device.width, device.height, device.size, device.mode, device.bounding_box)')
    expect(h.stdout).toEqual(['128 64 (128, 64) 1 (0, 0, 127, 63)'])
  })
  it('tekst met canvas en ImageDraw verschijnt op het scherm', async () => {
    const r = await run('with canvas(device) as draw:\n    draw.text((0, 0), "Hallo!", fill="white")')
    expect(r.error).toBeNull()
    expect(shown()).toHaveLength(1)
    expect(h.bridge.litPixels()).toBeGreaterThan(20)
    expect(h.bridge.litPixels()).toBeLessThan(400)
  })
  it('rechthoek met bounding_box: de rand is aan, het midden uit', async () => {
    await run('with canvas(device) as draw:\n    draw.rectangle(device.bounding_box, outline="white", fill="black")')
    for (const [x, y] of [[0, 0], [127, 0], [0, 63], [127, 63], [64, 0], [0, 32]]) expect(h.bridge.pixel(x, y), `${x},${y}`).toBe(true)
    expect(h.bridge.pixel(64, 32)).toBe(false)
    expect(h.bridge.litPixels()).toBe(2 * 128 + 2 * 62)
  })
  it('punt, lijn en cirkel op de juiste plek', async () => {
    await run('with canvas(device) as draw:\n    draw.point((10, 20), fill="white")\n    draw.line((20, 0, 20, 63), fill="white")\n    draw.ellipse((60, 20, 80, 40), outline="white")')
    expect(h.bridge.pixel(10, 20)).toBe(true)
    expect(h.bridge.pixel(11, 20)).toBe(false)
    expect(h.bridge.pixel(20, 33)).toBe(true)
    expect(h.bridge.pixel(70, 20)).toBe(true)
    expect(h.bridge.pixel(70, 30)).toBe(false)
  })
  it('een eigen lettertype via ImageFont.load_default()', async () => {
    await run('from PIL import ImageFont\nfont = ImageFont.load_default()\nwith canvas(device) as draw:\n    draw.text((0, 0), "21.5 C", font=font, fill="white")')
    expect(h.bridge.litPixels()).toBeGreaterThan(20)
  })
  it('een nieuwe canvas begint zwart (vorige inhoud verdwijnt)', async () => {
    await run('with canvas(device) as draw:\n    draw.rectangle((0, 0, 127, 63), fill="white")\nwith canvas(device) as draw:\n    draw.point((1, 1), fill="white")')
    expect(h.bridge.litPixels()).toBe(1)
  })
  it('een fout in het canvas-blok toont niets en geeft de fout door', async () => {
    const r = await run('with canvas(device) as draw:\n    draw.point((1, 1), fill="white")\n    1 / 0')
    expect(r.error?.type).toBe('ZeroDivisionError')
    expect(shown()).toHaveLength(0)
  })
  it('device.clear() maakt het scherm zwart', async () => {
    await run('with canvas(device) as draw:\n    draw.rectangle((0, 0, 127, 63), fill="white")\ndevice.clear()')
    expect(h.bridge.litPixels()).toBe(0)
  })
  it('device.display(image) met een Pillow-plaatje', async () => {
    await run('from PIL import Image, ImageDraw\nimg = Image.new("1", device.size)\nImageDraw.Draw(img).line((0, 0, 127, 63), fill=1)\ndevice.display(img)')
    expect(h.bridge.pixel(0, 0)).toBe(true)
    expect(h.bridge.pixel(127, 63)).toBe(true)
  })
  it('een RGB-plaatje wordt omgezet naar zwart-wit', async () => {
    await run('from PIL import Image, ImageDraw\nimg = Image.new("RGB", device.size, "black")\nImageDraw.Draw(img).rectangle((0, 0, 9, 9), fill=(255, 255, 255))\ndevice.display(img)')
    expect(h.bridge.pixel(5, 5)).toBe(true)
    expect(h.bridge.pixel(50, 50)).toBe(false)
  })
  it('plaatje met de verkeerde afmeting → duidelijke fout', async () => {
    const r = await run('from PIL import Image\ndevice.display(Image.new("1", (10, 10)))')
    expect(r.error?.type).toBe('ValueError')
    expect(r.error?.message).toContain('128')
  })
  it('hide / show / contrast', async () => {
    await run('device.hide()')
    expect(h.bridge.state.displayOn()).toBe(false)
    await run('device.hide()\ndevice.show()\ndevice.contrast(100)')
    expect(h.bridge.state.displayOn()).toBe(true)
    expect(h.bridge.state.contrast()).toBe(100)
  })
  it('contrast buiten 0–255 → ValueError', async () => {
    expect((await run('device.contrast(300)')).error?.type).toBe('ValueError')
  })
  it('kleinere schermen (128×32) tekenen linksboven', async () => {
    await run('device = ssd1306(serial, width=128, height=32)\nprint(device.size)\nwith canvas(device) as draw:\n    draw.point((3, 3), fill="white")')
    expect(h.stdout).toEqual(['(128, 32)'])
    expect(h.bridge.pixel(3, 3)).toBe(true)
  })
  it('geen OLED op de werkbank → DeviceNotFoundError met het adres', async () => {
    h.bridge.setParts([])
    const r = await run('')
    expect(r.error?.type).toBe('DeviceNotFoundError')
    expect(r.error?.message).toContain('0x3C')
  })
  it('OLED zonder voeding of op de verkeerde pinnen wordt niet gevonden', async () => {
    h.bridge.setParts([withPins('oled', { sda: 11, scl: 5, v33: 1, gnd: 6 })])
    expect((await run('')).error?.type).toBe('DeviceNotFoundError')
    h.bridge.setParts([withPins('oled', { sda: 3, scl: 5, gnd: 6 })])
    expect((await run('')).error?.type).toBe('DeviceNotFoundError')
  })
  it('een ander I²C-adres (0x3D) wordt niet gevonden', async () => {
    const r = await h.run('from luma.core.interface.serial import i2c\ni2c(port=1, address=0x3D)')
    expect(r.error?.type).toBe('DeviceNotFoundError')
    expect(r.error?.message).toContain('0x3D')
  })
  it('andere schermchips (sh1106) bestaan hier niet', async () => {
    const r = await h.run('from luma.oled.device import sh1106')
    expect(r.error?.type).toBe('ImportError')
  })
  it('weerstation-patroon: tekst bijwerken elke seconde', async () => {
    await run('from time import sleep\nfor t in (20.5, 21.0, 21.5):\n    with canvas(device) as draw:\n        draw.text((0, 0), f"{t} C", fill="white")\n    sleep(1)')
    expect(shown()).toHaveLength(3)
    expect(shown().map((f) => Math.round(f.t))).toEqual([0, 1, 2])
  })
})
