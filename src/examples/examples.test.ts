import { beforeEach, describe, expect, it } from 'vitest'
import { benchWarnings } from '../bench/warnings'
import { isComplete, partIssues } from '../bench/partStatus'
import { terminalsOf } from '../bench/terminals'
import { celsiusToRaw } from '../bench/liveControls'
import { createHarness, type Harness } from '../engine/testing/pythonHarness'
import { parseProject, serializeProject } from '../project/parse'
import { EXAMPLES } from './index'

const ex = (id: string) => EXAMPLES.find((e) => e.id === id)!

describe('voorbeeldprojecten', () => {
  it('er zijn er negen (drie uit fase 1, zes nieuwe), met titel en uitleg', () => {
    expect(EXAMPLES.map((e) => e.id)).toEqual(['blink', 'knop-led', 'temperatuur-alarm', 'stoplicht', 'dimmer', 'kleurenmixer', 'servo-wijzer', 'parkeersensor', 'weerstation'])
    for (const e of EXAMPLES) {
      expect(e.titel.length).toBeGreaterThan(3)
      expect(e.uitleg.length).toBeGreaterThan(10)
    }
  })
  it.each(EXAMPLES.map((e) => [e.id, e] as const))('%s: geldig project, alles verbonden, geen waarschuwingen', (_id, e) => {
    expect(parseProject(JSON.parse(serializeProject(e.project)))).toEqual({ ok: true, value: e.project })
    expect(e.project.parts.length).toBeGreaterThan(0)
    expect(e.project.parts.every((p) => Object.keys(p.connections).length === terminalsOf(p.kind).length)).toBe(true)
    expect(benchWarnings(e.project.parts)).toEqual([])
    expect(partIssues(e.project.parts)).toEqual([])
    expect(e.project.parts.every(isComplete)).toBe(true)
    expect(e.project.version).toBe(2)
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

  // ---- fase 2 ----
  const raw = (v: number) => Math.round(v * 1023)
  const edges = (g: number, level: number) => h.bridge.history(g).filter((e, i, a) => e.level === level && (i === 0 || a[i - 1].level !== level))

  it('stoplicht: rood, groen, geel — en dan weer van voren af aan', async () => {
    const e = ex('stoplicht')
    h.bridge.setParts(e.project.parts)
    h.bridge.stopAfter(14)
    isTimeLimit(await h.run(e.project.code))
    const on = (g: number) => edges(g, 1).map((x) => Math.round(x.t))
    expect(on(17)).toEqual([0, 7, 14])   // rood
    expect(on(22)).toEqual([3, 10])      // groen
    expect(on(27)).toEqual([6, 13])      // geel
    // nooit twee leds tegelijk aan
    for (const t of [0.5, 3.5, 6.5, 7.5, 10.5, 13.5]) {
      const lit = [17, 22, 27].filter((g) => (h.bridge.history(g).filter((x) => x.t <= t).at(-1)?.level ?? 0) === 1)
      expect(lit, `t=${t}`).toHaveLength(1)
    }
    expect(h.bridge.warnings).toEqual([])
  })

  it('dimmer: de helderheid van de led volgt de potmeter', async () => {
    const e = ex('dimmer')
    h.bridge.setParts(e.project.parts)
    h.bridge.state.setAdcRaw(0, raw(0.2))
    h.bridge.at(1, () => h.bridge.state.setAdcRaw(0, raw(0.9)))
    h.bridge.at(2, () => h.bridge.state.setAdcRaw(0, 0))
    h.bridge.stopAfter(3)
    isTimeLimit(await h.run(e.project.code))
    const at = (t: number) => h.bridge.history(18).filter((x) => x.t <= t).at(-1)!.level
    expect(at(0.5)).toBeCloseTo(0.2, 1)
    expect(at(1.5)).toBeCloseTo(0.9, 1)
    expect(at(2.5)).toBe(0)
    expect(h.bridge.warnings).toEqual([])
  })

  it('kleurenmixer: drie potmeters sturen rood, groen en blauw', async () => {
    const e = ex('kleurenmixer')
    h.bridge.setParts(e.project.parts)
    h.bridge.state.setAdcRaw(0, raw(1)); h.bridge.state.setAdcRaw(1, 0); h.bridge.state.setAdcRaw(2, 0)
    h.bridge.at(1, () => { h.bridge.state.setAdcRaw(0, 0); h.bridge.state.setAdcRaw(1, raw(0.5)); h.bridge.state.setAdcRaw(2, raw(1)) })
    h.bridge.stopAfter(2)
    isTimeLimit(await h.run(e.project.code))
    const at = (g: number, t: number) => Math.round(h.bridge.history(g).filter((x) => x.t <= t).at(-1)!.level * 10) / 10
    expect([17, 27, 22].map((g) => at(g, 0.5))).toEqual([1, 0, 0])
    expect([17, 27, 22].map((g) => at(g, 1.5))).toEqual([0, 0.5, 1])
    expect(h.bridge.warnings).toEqual([])
  })

  it('servo-wijzer: de arm volgt de potmeter van 0 tot 180 graden', async () => {
    const e = ex('servo-wijzer')
    h.bridge.setParts(e.project.parts)
    h.bridge.state.setAdcRaw(0, 0)
    h.bridge.at(1, () => h.bridge.state.setAdcRaw(0, raw(0.5)))
    h.bridge.at(2, () => h.bridge.state.setAdcRaw(0, 1023))
    h.bridge.stopAfter(3)
    isTimeLimit(await h.run(e.project.code))
    const at = (t: number) => h.bridge.servoHistory(18).filter((x) => x.t <= t).at(-1)!.position as number
    expect(at(0.5)).toBe(0)
    expect(at(1.5)).toBeCloseTo(0.5, 1)
    expect(at(2.5)).toBe(1)
    expect(h.bridge.warnings).toEqual([])
  })

  it('parkeersensor: dichterbij = sneller piepen, ver weg = stil', async () => {
    const e = ex('parkeersensor')
    h.bridge.setParts(e.project.parts)
    h.bridge.state.setDistanceCm(24, 300)
    h.bridge.at(2, () => h.bridge.state.setDistanceCm(24, 80))
    h.bridge.at(5, () => h.bridge.state.setDistanceCm(24, 20))
    h.bridge.stopAfter(8)
    isTimeLimit(await h.run(e.project.code))
    const beeps = (a: number, b: number) => edges(22, 1).filter((x) => x.t >= a && x.t < b).length
    expect(beeps(0, 2)).toBe(0)
    const far = beeps(2, 5)
    const near = beeps(5, 8)
    expect(far).toBeGreaterThanOrEqual(5)
    expect(near).toBeGreaterThan(far * 2)
    expect(h.stdout.some((l) => l === '300 cm')).toBe(true)
    expect(h.bridge.warnings).toEqual([])
  })

  it('weerstation: de temperatuur verschijnt op het OLED-scherm en verandert mee', async () => {
    const e = ex('weerstation')
    h.bridge.setParts(e.project.parts)
    h.bridge.state.setAdcRaw(0, celsiusToRaw(20))
    h.bridge.at(2.5, () => h.bridge.state.setAdcRaw(0, celsiusToRaw(31)))
    h.bridge.stopAfter(5)
    isTimeLimit(await h.run(e.project.code))
    const shown = h.bridge.frames.slice(1) // het eerste beeld is het leegmaken bij het starten
    expect(shown.length).toBeGreaterThanOrEqual(4)
    const lit = (d: Uint8Array) => d.reduce((n, b) => n + b.toString(2).replace(/0/g, '').length, 0)
    expect(lit(shown[0].data)).toBeGreaterThan(150)           // kader, titel en groot getal
    expect(Array.from(shown[0].data)).toEqual(Array.from(shown[1].data)) // zelfde temperatuur = zelfde beeld
    expect(Array.from(shown[0].data)).not.toEqual(Array.from(shown.at(-1)!.data)) // andere temperatuur = ander beeld
    expect(h.bridge.warnings).toEqual([])
  })

  it('alle voorbeelden draaien 20 seconden zonder Python-fout of waarschuwing', async () => {
    for (const e of EXAMPLES) {
      h = await createHarness()
      h.bridge.setParts(e.project.parts)
      h.bridge.state.setAdcRaw(0, 512); h.bridge.state.setAdcRaw(1, 300); h.bridge.state.setAdcRaw(2, 800)
      h.bridge.state.setDistanceCm(24, 150)
      h.bridge.stopAfter(20)
      const r = await h.run(e.project.code)
      expect(r.error?.message, e.id).toContain('TestTimeLimit')
      expect(h.bridge.warnings, e.id).toEqual([])
    }
  })
})
