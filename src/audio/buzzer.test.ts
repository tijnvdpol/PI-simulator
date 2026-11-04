import { describe, expect, it, vi } from 'vitest'
import { BuzzerSound } from './buzzer'

function fakeCtx() {
  const oscs: { type: string; frequency: { value: number }; connect: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = []
  const ctx = {
    state: 'running',
    currentTime: 0,
    destination: {},
    resume: vi.fn(async () => {}),
    createOscillator: vi.fn(() => {
      const o = { type: 'sine', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() }
      oscs.push(o)
      return o
    }),
    createGain: vi.fn(() => ({ gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn() })),
  }
  return { ctx: ctx as unknown as AudioContext, raw: ctx, oscs }
}

describe('BuzzerSound', () => {
  it('setActive(true) start één oscillator, nogmaals true maakt er geen tweede', () => {
    const { ctx, raw, oscs } = fakeCtx()
    const s = new BuzzerSound(ctx)
    s.setActive(true)
    s.setActive(true)
    expect(raw.createOscillator).toHaveBeenCalledTimes(1)
    expect(oscs[0].start).toHaveBeenCalledTimes(1)
    expect(oscs[0].type).toBe('square')
  })
  it('setActive(false) stopt hem; daarna kan hij opnieuw starten', () => {
    const { ctx, raw, oscs } = fakeCtx()
    const s = new BuzzerSound(ctx)
    s.setActive(true)
    s.setActive(false)
    expect(oscs[0].stop).toHaveBeenCalledTimes(1)
    s.setActive(true)
    expect(raw.createOscillator).toHaveBeenCalledTimes(2)
  })
  it('setActive(false) zonder eerst aan te zetten doet niets', () => {
    const { ctx, oscs } = fakeCtx()
    new BuzzerSound(ctx).setActive(false)
    expect(oscs).toHaveLength(0)
  })
  it('dispose stopt een lopende toon', () => {
    const { ctx, oscs } = fakeCtx()
    const s = new BuzzerSound(ctx)
    s.setActive(true)
    s.dispose()
    expect(oscs[0].stop).toHaveBeenCalledTimes(1)
  })
  it('zonder AudioContext (nog niet unlocked) gebeurt er niets en er is geen fout', () => {
    expect(() => new BuzzerSound().setActive(true)).not.toThrow()
  })
  it('unlock hervat een gepauzeerde context', async () => {
    const { ctx, raw } = fakeCtx()
    raw.state = 'suspended'
    await new BuzzerSound(ctx).unlock()
    expect(raw.resume).toHaveBeenCalled()
  })
})
