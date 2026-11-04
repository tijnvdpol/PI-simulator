import { beforeAll, describe, expect, it } from 'vitest'
import { createHarness, type Harness } from './testing/pythonHarness'

describe('python-harnas', () => {
  let h: Harness
  beforeAll(async () => { h = await createHarness() })

  it('kan gpiozero importeren', async () => {
    expect(await h.run('import gpiozero')).toEqual({ error: null })
  })
  it('vangt print-uitvoer', async () => {
    await h.run("print('hoi')")
    expect(h.stdout).toContain('hoi')
  })
  it('geeft fouten gestructureerd terug', async () => {
    const r = await h.run('1/0')
    expect(r.error?.type).toBe('ZeroDivisionError')
  })
})
