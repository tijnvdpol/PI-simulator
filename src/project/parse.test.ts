import { describe, expect, it } from 'vitest'
import { parseProject, serializeProject } from './parse'
import { emptyProject, type Project } from './types'

const sample: Project = {
  version: 1,
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
    const r = parseProject({ ...sample, version: 2 })
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
