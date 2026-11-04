import { beforeAll, describe, expect, it } from 'vitest'
import { createHarness, type Harness } from './testing/pythonHarness'

describe('pisim.runner', () => {
  let h: Harness
  beforeAll(async () => { h = await createHarness() })

  it('NameError met regelnummer', async () => {
    const r = await h.run('led.on()')
    expect(r.error).toMatchObject({ type: 'NameError', line: 1 })
    expect(r.error?.message).toContain("name 'led' is not defined")
  })
  it('SyntaxError (dubbele punt) met regel', async () => {
    expect((await h.run('x = 1\nif True\n    pass')).error).toMatchObject({ type: 'SyntaxError', line: 2 })
  })
  it('IndentationError', async () => {
    expect((await h.run('if True:\npass')).error).toMatchObject({ type: 'IndentationError', line: 2 })
  })
  it('TypeError', async () => {
    expect((await h.run('x = 1\nlen(5)')).error).toMatchObject({ type: 'TypeError', line: 2 })
  })
  it('fout in diepe functie meldt de regel in main.py', async () => {
    const r = await h.run('def f():\n    return 1/0\ndef g():\n    f()\ng()')
    expect(r.error).toMatchObject({ type: 'ZeroDivisionError', line: 2 })
    expect(r.error?.traceback).toContain('ZeroDivisionError')
  })
  it('fout vanuit gpiozero meldt de regel van de gebruiker', async () => {
    const r = await h.run('from gpiozero import LED\nLED(99)')
    expect(r.error).toMatchObject({ type: 'PinInvalidPin', line: 2 })
  })
  it('succesvolle code geeft null, SystemExit telt niet als fout', async () => {
    expect((await h.run('x = 1')).error).toBeNull()
    expect((await h.run('raise SystemExit')).error).toBeNull()
  })
})
