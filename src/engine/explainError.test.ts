import { beforeAll, describe, expect, it } from 'vitest'
import { explainError, explainPinWarning, explainPowerPin, type PythonErrorInfo } from './explainError'
import { createHarness, type Harness } from './testing/pythonHarness'
import { pinByPhysical } from '../pinout/pinout'

describe('explainError met echte Pyodide-meldingen', () => {
  let h: Harness
  beforeAll(async () => { h = await createHarness() })
  const explain = async (code: string) => {
    const r = await h.run(code)
    expect(r.error).not.toBeNull()
    return { e: explainError(r.error as PythonErrorInfo), raw: r.error as PythonErrorInfo }
  }

  it('NameError op regel 4 met `led`', async () => {
    const { e } = await explain('from gpiozero import Button\nb = 1\nx = 2\nled.on()')
    expect(e.uitleg).toBe('Regel 4: je gebruikt `led`, maar die heb je nog niet aangemaakt.')
    expect(e.regel).toBe(4)
    expect(e.technisch).toContain("NameError: name 'led' is not defined")
  })
  it('NameError voor een bekende import geeft een tip', async () => {
    const { e } = await explain('LED(17)')
    expect(e.uitleg).toContain('from gpiozero import LED')
  })
  it('IndentationError: verwacht inspringing', async () => {
    const { e } = await explain('if True:\npass')
    expect(e.titel).toBe('Inspringing klopt niet')
    expect(e.uitleg).toContain('Regel 2')
    expect(e.uitleg).toContain('inspringen')
  })
  it('IndentationError: te ver ingesprongen', async () => {
    const { e } = await explain('if True:\n    x=1\n      y=2')
    expect(e.uitleg).toContain('te ver')
  })
  it('IndentationError: past niet bij erboven', async () => {
    const { e } = await explain('if True:\n    x=1\n  y=2')
    expect(e.uitleg).toContain('past niet')
  })
  it('SyntaxError: dubbele punt vergeten', async () => {
    const { e } = await explain('for i in range(3)\n    pass')
    expect(e.uitleg).toContain('dubbele punt')
    expect(e.regel).toBe(1)
  })
  it('SyntaxError: haakje niet gesloten', async () => {
    expect((await explain('print("a"')).e.uitleg).toContain('haakje')
  })
  it('SyntaxError: tekst niet afgesloten', async () => {
    expect((await explain('x = "abc')).e.uitleg).toContain('aanhalingstekens')
  })
  it('SyntaxError: algemeen', async () => {
    expect((await explain('x = 5 5')).e.uitleg).toContain('begrijpt deze regel niet')
  })
  it('TypeError: niet aanroepbaar', async () => {
    const { e } = await explain('x = 5\nx()')
    expect(e.titel).toBe('Verkeerd soort waarde')
    expect(e.uitleg).toContain('functie')
  })
  it('TypeError: aantal waarden', async () => {
    const { e } = await explain('def f():\n    pass\nf(1)')
    expect(e.uitleg).toContain('`f`')
    expect(e.uitleg).toContain('0')
    expect(e.uitleg).toContain('1')
  })
  it('TypeError: vergeten argument', async () => {
    expect((await explain('def f(a):\n    pass\nf()')).e.uitleg).toContain('`a`')
  })
  it('TypeError: getal + tekst', async () => {
    const { e } = await explain('1 + "a"')
    expect(e.uitleg).toContain('getal')
    expect(e.uitleg).toContain('tekst')
  })
  it('TypeError: onbekende variant valt terug op algemene uitleg', async () => {
    const { e } = await explain('x = None\nx[0]')
    expect(e.titel).toBe('Verkeerd soort waarde')
    expect(e.uitleg).toContain('Regel 2')
  })
  it('onbekende fouttypes vallen terug op "Er ging iets mis"', async () => {
    for (const code of ['1/0']) {
      const { e, raw } = await explain(code)
      expect(e.titel).toBe('Er ging iets mis')
      expect(e.uitleg).toContain('Regel')
      expect(e.technisch).toContain(raw.type)
    }
  })
  it('input() krijgt een eigen uitleg in het Nederlands', async () => {
    const { e } = await explain('naam = input("Naam? ")')
    expect(e.titel).toBe('input() werkt hier niet')
    expect(e.uitleg).toContain('Regel 1')
    expect(e.uitleg).toContain('input()')
    expect(e.uitleg).toContain('direct in je code')
  })
  it('dezelfde pin twee keer gebruiken krijgt een eigen uitleg', async () => {
    const { e } = await explain('from gpiozero import LED\nLED(17)\nLED(17)')
    expect(e.titel).toBe('Pin al in gebruik')
    expect(e.uitleg).toContain('Regel 3')
    expect(e.uitleg).toContain('GPIO17')
    expect(e.uitleg).toContain('close()')
  })
  it('een ontbrekende pin (LED()) krijgt een eigen uitleg', async () => {
    const { e } = await explain('from gpiozero import LED\nLED()')
    expect(e.titel).toBe('Pin ontbreekt')
    expect(e.uitleg).toContain('LED(17)')
  })
  it('een gesloten onderdeel gebruiken krijgt een eigen uitleg', async () => {
    const { e } = await explain('from gpiozero import LED\nl = LED(17)\nl.close()\nl.on()')
    expect(e.titel).toBe('Onderdeel is gesloten')
    expect(e.uitleg).toContain('close()')
  })
  it('regel undefined (Python None → JS undefined) wordt als "geen regel" behandeld', () => {
    const e = explainError({ type: 'NameError', message: "name 'x' is not defined", line: undefined as unknown as null, traceback: '' })
    expect(e.regel).toBeNull()
    expect(e.uitleg).not.toContain('undefined')
  })
  it('zonder regelnummer geen "Regel null"', () => {
    const e = explainError({ type: 'NameError', message: "name 'x' is not defined", line: null, traceback: '' })
    expect(e.uitleg).not.toContain('Regel')
    expect(e.regel).toBeNull()
    expect(e.technisch).toContain('NameError')
  })
})

describe('pin-meldingen', () => {
  it('pin-unconnected noemt GPIO17 en dat er niets op zit', () => {
    const i = explainPinWarning({ code: 'pin-unconnected', pin: '17', device: 'LED' })
    expect(i.message).toContain('GPIO17')
    expect(i.message).toContain('niets')
    expect(i.pin).toBe('17')
    expect(i.id).toBe('pin-unconnected:17')
  })
  it('pin-wrong-kind noemt wat er wél zit', () => {
    const i = explainPinWarning({ code: 'pin-wrong-kind', pin: '17', device: 'LED', found: 'button' })
    expect(i.message).toContain('knop')
    expect(i.message).toContain('led')
  })
  it('gereserveerde GPIO0/GPIO1 geven geen "pin ?"', () => {
    for (const pin of ['0', '1']) {
      const m = explainPinWarning({ code: 'pin-unconnected', pin, device: 'LED' }).message
      expect(m).not.toContain('?')
      expect(m).toContain('gereserveerd')
    }
  })
  it('MCP3008-kanaal wordt als kanaal genoemd', () => {
    expect(explainPinWarning({ code: 'pin-unconnected', pin: 'CH2', device: 'MCP3008' }).message).toContain('kanaal CH2')
  })
  it('voedingspinnen krijgen eigen uitleg', () => {
    expect(explainPowerPin({ kind: 'led' }, pinByPhysical(2))).toContain('5V')
    expect(explainPowerPin({ kind: 'led' }, pinByPhysical(2))).toContain('niet door Python')
    expect(explainPowerPin({ kind: 'button' }, pinByPhysical(1))).toContain('3V3')
    expect(explainPowerPin({ kind: 'buzzer' }, pinByPhysical(6))).toContain('GND')
  })
})

describe('uitleg voor de nieuwe onderdelen (fase 2)', () => {
  let h: Harness
  beforeAll(async () => { h = await createHarness() })
  const explain = async (code: string) => {
    const r = await h.run(code)
    expect(r.error).not.toBeNull()
    return explainError(r.error as PythonErrorInfo)
  }

  it('OLED niet gevonden: uitleg met SDA/SCL-pinnen en voeding', async () => {
    h.bridge.setParts([])
    const e = await explain('from luma.core.interface.serial import i2c\ni2c(port=1, address=0x3C)')
    expect(e.titel).toBe('OLED-scherm niet gevonden')
    expect(e.uitleg).toContain('0x3C')
    expect(e.uitleg).toContain('pin 3 (GPIO 2)')
    expect(e.uitleg).toContain('pin 5 (GPIO 3)')
    expect(e.uitleg).toContain('3V3')
    expect(e.uitleg).toContain('GND')
    expect(e.uitleg).toMatch(/^Regel 2:/)
  })
  it('ander I²C-adres noemt het adres dat de simulator wel kent', async () => {
    h.bridge.setParts([])
    const e = await explain('from luma.core.interface.serial import i2c\ni2c(address=0x3D)')
    expect(e.uitleg).toContain('0x3D')
    expect(e.uitleg).toContain('0x3C')
  })
  it('pin vergeten bij een RGB-led', async () => {
    const e = await explain('from gpiozero import RGBLED\nRGBLED(17, 27)')
    expect(e.titel).toBe('Pin ontbreekt')
    expect(e.uitleg).toContain('RGBLED(17, 27, 22)')
  })
  it('pin vergeten bij een afstandssensor', async () => {
    const e = await explain('from gpiozero import DistanceSensor\nDistanceSensor(echo=24)')
    expect(e.uitleg).toContain('echo')
    expect(e.uitleg).toContain('trigger')
  })
  it('waarde buiten bereik: PWMLED', async () => {
    h.bridge.setParts([])
    const e = await explain('from gpiozero import PWMLED\nPWMLED(18).value = 2')
    expect(e.titel).toBe('Waarde buiten het bereik')
    expect(e.uitleg).toContain('0 en 1')
    expect(e.uitleg).toContain('Regel 2')
  })
  it('waarde buiten bereik: servo en AngularServo en kleur', async () => {
    h.bridge.setParts([])
    expect((await explain('from gpiozero import Servo\nServo(18).value = 5')).uitleg).toContain('−1 en 1')
    const a = await explain('from gpiozero import AngularServo\nAngularServo(18, min_angle=0, max_angle=90, initial_angle=0).angle = 120')
    expect(a.uitleg).toContain('0 en 90')
    expect((await explain('from gpiozero import RGBLED\nRGBLED(17, 27, 22).color = (2, 0, 0)')).uitleg).toContain('0 en 1')
  })
  it('een scherm-chip die er niet is (sh1106)', async () => {
    const e = await explain('from luma.oled.device import sh1106')
    expect(e.titel).toBe('Dit scherm kent de simulator niet')
    expect(e.uitleg).toContain('ssd1306')
  })
  it('NameError-tips voor de nieuwe klassen', async () => {
    expect((await explain('PWMLED(18)')).uitleg).toContain('from gpiozero import PWMLED')
    expect((await explain('RGBLED(1, 2, 3)')).uitleg).toContain('from gpiozero import RGBLED')
    expect((await explain('AngularServo(18)')).uitleg).toContain('from gpiozero import AngularServo')
    expect((await explain('DistanceSensor(1, 2)')).uitleg).toContain('from gpiozero import DistanceSensor')
    expect((await explain('canvas(None)')).uitleg).toContain('from luma.core.render import canvas')
    expect((await explain('ssd1306(None)')).uitleg).toContain('from luma.oled.device import ssd1306')
    expect((await explain('i2c()')).uitleg).toContain('from luma.core.interface.serial import i2c')
    expect((await explain('ImageDraw.Draw(1)')).uitleg).toContain('from PIL import ImageDraw')
  })
  it('pinwaarschuwingen noemen de nieuwe onderdelen bij hun Nederlandse naam', () => {
    expect(explainPinWarning({ code: 'pin-unconnected', pin: '18', device: 'Servo' }).message).toContain('servo')
    expect(explainPinWarning({ code: 'pin-unconnected', pin: '24', device: 'DistanceSensor' }).message).toContain('afstandssensor')
    expect(explainPinWarning({ code: 'pin-unconnected', pin: '17', device: 'RGBLED' }).message).toContain('RGB-led')
    expect(explainPinWarning({ code: 'pin-wrong-kind', pin: '18', device: 'PWMLED', found: 'led' }).message).toContain('dimbare led')
  })
})
