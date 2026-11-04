import { beforeEach, describe, expect, it } from 'vitest'
import { benchWarnings } from '../bench/warnings'
import { celsiusToRaw } from '../bench/liveControls'
import { createHarness, type Harness } from '../engine/testing/pythonHarness'
import { parseProject, serializeProject } from '../project/parse'
import { analyze } from '../circuit/analyze'
import { effectiveParts, inputsFromHardware, syncHardware } from '../circuit/live'
import { buildShareUrl, decodeShare } from '../project/share'
import { EXAMPLES } from './index'

const ex = (id: string) => EXAMPLES.find((e) => e.id === id)!

describe('voorbeeldprojecten', () => {
  it('er zijn drie simpele en drie pro-voorbeelden, met titel en uitleg', () => {
    expect(EXAMPLES.map((e) => e.id)).toEqual(['blink', 'knop-led', 'temperatuur-alarm', 'pro-led', 'pro-knop', 'pro-stoplicht'])
    expect(EXAMPLES.filter((e) => e.project.mode === 'pro')).toHaveLength(3)
    for (const e of EXAMPLES) {
      expect(e.titel.length).toBeGreaterThan(3)
      expect(e.uitleg.length).toBeGreaterThan(10)
    }
  })
  it.each(EXAMPLES.filter((e) => e.project.mode === 'simple').map((e) => [e.id, e] as const))('%s: geldig project, alles verbonden, geen waarschuwingen', (_id, e) => {
    expect(parseProject(JSON.parse(serializeProject(e.project)))).toEqual({ ok: true, value: e.project })
    expect(e.project.parts.length).toBeGreaterThan(0)
    expect(e.project.parts.every((p) => p.connection !== null)).toBe(true)
    expect(benchWarnings(e.project.parts)).toEqual([])
    expect(new Set(e.project.parts.map((p) => p.id)).size).toBe(e.project.parts.length)
  })
})

describe('voorbeelden draaien zonder fouten', () => {
  let h: Harness
  beforeEach(async () => { h = await createHarness() })
  const isTimeLimit = (r: Awaited<ReturnType<Harness['run']>>) => expect(r.error?.message).toContain('TestTimeLimit')

  it('knipperende led: aan/uit elke seconde, geen waarschuwingen', async () => {
    const e = ex('blink')
    h.bridge.setParts(e.project.parts)
    h.bridge.stopAfter(5)
    isTimeLimit(await h.run(e.project.code))
    const ev = h.bridge.history(17).slice(1) // eerste waarde is de beginstand
    expect(ev.slice(0, 5).map((x) => x.level)).toEqual([1, 0, 1, 0, 1])
    ev.slice(0, 5).forEach((x, i) => expect(x.t).toBeCloseTo(i, 1))
    expect(h.bridge.warnings).toEqual([])
  })

  it('knop schakelt led: eerste druk aan, tweede druk uit', async () => {
    const e = ex('knop-led')
    h.bridge.setParts(e.project.parts)
    const press = (a: number, b: number) => {
      h.bridge.at(a, () => h.bridge.state.setButtonPressed(27, true))
      h.bridge.at(b, () => h.bridge.state.setButtonPressed(27, false))
    }
    press(1.5, 2); press(3, 3.5)
    h.bridge.stopAfter(5)
    isTimeLimit(await h.run(e.project.code))
    const ev = h.bridge.history(17).slice(1)
    expect(ev.map((x) => x.level)).toEqual([1, 0])
    expect(ev[0].t).toBeCloseTo(1.5, 1)
    expect(ev[1].t).toBeCloseTo(3, 1)
    expect(h.bridge.warnings).toEqual([])
  })

  it('temperatuuralarm: stil bij 20 °C, piept bij 35 °C en print de temperatuur', async () => {
    const e = ex('temperatuur-alarm')
    h.bridge.setParts(e.project.parts)
    h.bridge.state.setAdcRaw(0, celsiusToRaw(20))
    h.bridge.at(2, () => h.bridge.state.setAdcRaw(0, celsiusToRaw(35)))
    h.bridge.stopAfter(4)
    isTimeLimit(await h.run(e.project.code))
    const buzz = h.bridge.history(22)
    expect(buzz.filter((x) => x.t < 1.9).every((x) => x.level === 0)).toBe(true)
    expect(h.bridge.last(22)).toBe(1)
    expect(h.stdout.some((l) => /^20\.\d °C$/.test(l))).toBe(true)
    expect(h.stdout.some((l) => /^3[45]\.\d °C$/.test(l))).toBe(true)
    expect(h.bridge.warnings).toEqual([])
  })
})

describe('pro-voorbeelden', () => {
  const pros = EXAMPLES.filter((e) => e.project.mode === 'pro')
  it.each(pros.map((e) => [e.id, e] as const))('%s: geldig project, geen simpele onderdelen, deellink niet te lang', (_id, e) => {
    expect(parseProject(JSON.parse(serializeProject(e.project)))).toEqual({ ok: true, value: e.project })
    expect(e.project.parts).toEqual([])
    expect(e.project.pro!.parts.length).toBeGreaterThan(0)
    expect(e.project.pro!.wires.length).toBeGreaterThan(0)
    const url = buildShareUrl(e.project, 'https://pi-simulator.vercel.app/')
    expect(url.length).toBeLessThan(2000)
    expect(decodeShare(url.slice(url.indexOf('#')))).toEqual({ ok: true, value: e.project })
  })
  it.each(pros.map((e) => [e.id, e] as const))('%s: de schakeling klopt en het programma draait zonder waarschuwingen', async (id, e) => {
    const h = await createHarness()
    const circuit = e.project.pro!
    const frame = (pressed: Record<string, boolean> = {}) => {
      const inputs = inputsFromHardware(h.bridge.state, { pressed })
      const result = analyze(circuit, inputs)
      h.bridge.state.setParts(effectiveParts(result))
      syncHardware(h.bridge.state, result, inputs)
      return result
    }
    frame()
    const seen: Record<string, string> = {}
    const lit = (r: ReturnType<typeof frame>) => Object.entries(r.parts).filter(([, p]) => p.status === 'on').map(([k]) => k)
    if (id === 'pro-knop') {
      h.bridge.at(0.1, () => frame())
      h.bridge.at(0.9, () => { frame({ p1: true }) })
      h.bridge.at(1.0, () => { seen.pressed = lit(frame({ p1: true })).join() })
      h.bridge.at(1.2, () => { frame({ p1: false }) })
      h.bridge.at(1.6, () => { seen.released = lit(frame()).join() })
    } else if (id === 'pro-stoplicht') {
      h.bridge.at(1, () => { seen.rood = lit(frame()).join() })
      h.bridge.at(4, () => { seen.groen = lit(frame()).join() })
      h.bridge.at(7, () => { seen.geel = lit(frame()).join() })
    } else {
      h.bridge.at(0.5, () => { seen.aan = lit(frame()).join() })
      h.bridge.at(1.5, () => { seen.uit = lit(frame()).join() })
    }
    h.bridge.stopAfter(8)
    const r = await h.run(e.project.code)
    expect(r.error?.message).toContain('TestTimeLimit')
    expect(h.bridge.warnings).toEqual([])
    const final = frame()
    expect(final.issues).toEqual([])
    expect(final.short).toBe(false)
    if (id === 'pro-led') expect(seen).toEqual({ aan: 'p2', uit: '' })
    if (id === 'pro-knop') expect(seen).toEqual({ pressed: 'p3', released: 'p3' }) // toggle: aan na de eerste druk
    if (id === 'pro-stoplicht') expect(seen).toEqual({ rood: 'p2', groen: 'p6', geel: 'p4' })
  })
})
