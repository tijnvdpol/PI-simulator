import { describe, expect, it } from 'vitest'
import { parseProject, serializeProject } from './parse'
import { emptyProject, type Project } from './types'

const sample: Project = {
  version: 2,
  mode: 'simple',
  name: 'Test',
  code: 'print("hoi")',
  parts: [
    { id: 'a', kind: 'led', x: 10, y: 20, color: 'green', connection: { type: 'pin', physical: 11 } },
    { id: 'b', kind: 'potentiometer', x: 0, y: 0, connection: { type: 'adc', channel: 3 } },
    { id: 'c', kind: 'button', x: 5, y: 5, connection: null },
  ],
}

describe('parseProject', () => {
  it('roundtrip geeft hetzelfde project', () => {
    const r = parseProject(JSON.parse(serializeProject(sample)))
    expect(r).toEqual({ ok: true, value: sample })
  })
  it('weigert ontbrekende versie', () => {
    const { version: _v, ...rest } = sample
    expect(parseProject(rest).ok).toBe(false)
  })
  it('weigert nieuwere versie met duidelijke melding', () => {
    const r = parseProject({ ...sample, version: 3 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('nieuwere versie')
  })
  it('weigert onbekende onderdeelsoort', () => {
    expect(parseProject({ ...sample, parts: [{ ...sample.parts[0], kind: 'drone' }] }).ok).toBe(false)
  })
  it('weigert ADC-kanaal buiten 0–7', () => {
    expect(parseProject({ ...sample, parts: [{ ...sample.parts[1], connection: { type: 'adc', channel: 9 } }] }).ok).toBe(false)
  })
  it('weigert pin buiten 1–40', () => {
    expect(parseProject({ ...sample, parts: [{ ...sample.parts[0], connection: { type: 'pin', physical: 41 } }] }).ok).toBe(false)
  })
  it('weigert parts die geen array is', () => {
    expect(parseProject({ ...sample, parts: 'nee' }).ok).toBe(false)
  })
  it('negeert onbekende velden', () => {
    const r = parseProject({ ...sample, extra: 1, parts: [{ ...sample.parts[0], zever: true }] })
    expect(r).toEqual({ ok: true, value: { ...sample, parts: [sample.parts[0]] } })
  })
  it('weigert ontbrekende code', () => {
    const { code: _c, ...rest } = sample
    expect(parseProject(rest).ok).toBe(false)
  })
  it('weigert niet-objecten', () => {
    expect(parseProject(null).ok).toBe(false)
    expect(parseProject('x').ok).toBe(false)
  })
  it('emptyProject is geldig', () => {
    expect(parseProject(emptyProject()).ok).toBe(true)
  })
})

describe('versie 1 → 2 (fase 3)', () => {
  it('een oud project wordt een simpel project', () => {
    const v1 = { version: 1, name: 'Oud', code: 'print(1)', parts: [sample.parts[0]] }
    expect(parseProject(v1)).toEqual({ ok: true, value: { version: 2, mode: 'simple', name: 'Oud', code: 'print(1)', parts: [sample.parts[0]] } })
  })
  it('een onbekende modus wordt geweigerd', () => {
    expect(parseProject({ ...sample, mode: 'expert' }).ok).toBe(false)
  })
})

describe('pro-projecten', () => {
  const pro: Project = {
    version: 2, mode: 'pro', name: 'Pro', code: 'x = 1', parts: [],
    pro: {
      parts: [
        { id: 'p1', kind: 'resistor', col: 5, row: 0, rot: 0, resistance: 330 },
        { id: 'p2', kind: 'led', col: 9, row: 1, rot: 0, color: 'green' },
        { id: 'p3', kind: 'button', col: 15, row: 4, rot: 0 },
      ],
      wires: [
        { id: 'w1', a: 'pin:11', b: 'h:b5', color: 'blue' },
        { id: 'w2', a: 'h:c10', b: 'pin:6', color: 'black' },
      ],
    },
  }
  const bad = (change: (p: Project) => unknown) => {
    const copy = JSON.parse(JSON.stringify(pro)) as Project
    return parseProject(change(copy) ?? copy)
  }
  it('roundtrip', () => {
    expect(parseProject(JSON.parse(serializeProject(pro)))).toEqual({ ok: true, value: pro })
  })
  it('emptyProject("pro") is geldig', () => {
    const e = emptyProject('pro')
    expect(parseProject(e)).toEqual({ ok: true, value: e })
  })
  it('een pro-project zonder schakeling krijgt een lege schakeling', () => {
    const { pro: _p, ...rest } = pro
    const r = parseProject(rest)
    expect(r.ok && r.value.pro).toEqual({ parts: [], wires: [] })
  })
  it('weigert een onderdeel dat niet op het bord past', () => {
    expect(bad((p) => { p.pro!.parts[1].col = 30 }).ok).toBe(false)
  })
  it('weigert twee onderdelen in hetzelfde gaatje', () => {
    expect(bad((p) => { p.pro!.parts[1].col = 8; p.pro!.parts[1].row = 0 }).ok).toBe(false)
  })
  it('weigert een onbekend aansluitpunt in een draad', () => {
    expect(bad((p) => { p.pro!.wires[0].b = 'h:z99' }).ok).toBe(false)
  })
  it('weigert een onbekende onderdeelsoort, kleur of weerstand', () => {
    expect(bad((p) => { (p.pro!.parts[0] as { kind: string }).kind = 'drone' }).ok).toBe(false)
    expect(bad((p) => { (p.pro!.wires[0] as { color: string }).color = 'roze' }).ok).toBe(false)
    expect(bad((p) => { p.pro!.parts[0].resistance = -5 }).ok).toBe(false)
    expect(bad((p) => { (p.pro!.parts[0] as { rot: number }).rot = 7 }).ok).toBe(false)
  })
  it('weigert dubbele id’s', () => {
    expect(bad((p) => { p.pro!.wires[1].id = 'w1' }).ok).toBe(false)
  })
})
