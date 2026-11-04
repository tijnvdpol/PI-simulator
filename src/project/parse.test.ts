import { describe, expect, it } from 'vitest'
import { parseProject, serializeProject } from './parse'
import { FASE1_JSON } from './fase1Fixtures'
import { emptyProject, type Project } from './types'

const sample: Project = {
  version: 2,
  name: 'Test',
  code: 'print("hoi")',
  parts: [
    { id: 'a', kind: 'led', x: 10, y: 20, color: 'green', connections: { signal: { type: 'pin', physical: 11 } } },
    { id: 'b', kind: 'potentiometer', x: 0, y: 0, connections: { signal: { type: 'adc', channel: 3 } } },
    { id: 'c', kind: 'button', x: 5, y: 5, connections: {} },
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
    expect(parseProject({ ...sample, parts: [{ ...sample.parts[1], connections: { signal: { type: 'adc', channel: 9 } } }] }).ok).toBe(false)
  })
  it('weigert pin buiten 1–40', () => {
    expect(parseProject({ ...sample, parts: [{ ...sample.parts[0], connections: { signal: { type: 'pin', physical: 41 } } }] }).ok).toBe(false)
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

describe('nieuwe onderdelen (versie 2)', () => {
  const servo = { id: 's', kind: 'servo', x: 1, y: 2, connections: { signal: { type: 'pin', physical: 12 }, v5: { type: 'pin', physical: 2 }, gnd: { type: 'pin', physical: 6 } } }
  it('roundtrip met meerdere aansluitingen', () => {
    const p: Project = { ...sample, parts: [servo as Project['parts'][0]] }
    expect(parseProject(JSON.parse(serializeProject(p)))).toEqual({ ok: true, value: p })
  })
  it('weigert een terminal die het soort niet kent', () => {
    const r = parseProject({ ...sample, parts: [{ ...servo, connections: { signaal: { type: 'pin', physical: 12 } } }] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('servo')
  })
  it('weigert een kanaal op een pin-terminal', () => {
    expect(parseProject({ ...sample, parts: [{ ...servo, connections: { signal: { type: 'adc', channel: 1 } } }] }).ok).toBe(false)
  })
  it('een ongeschikte pin (OLED SDA op pin 11) wordt wel geladen; de werkbank waarschuwt daarna', () => {
    const oled = { id: 'o', kind: 'oled', x: 0, y: 0, connections: { sda: { type: 'pin', physical: 11 } } }
    expect(parseProject({ ...sample, parts: [oled] }).ok).toBe(true)
  })
})

describe('omzetting van fase 1 (versie 1 → 2)', () => {
  it('zet connection om naar connections.signal', () => {
    const r = parseProject(FASE1_JSON)
    expect(r).toEqual({
      ok: true,
      value: {
        version: 2, name: 'Fase 1 deellink', code: FASE1_JSON.code,
        parts: [
          { id: 'part-1', kind: 'led', x: 420, y: 140, color: 'red', connections: { signal: { type: 'pin', physical: 11 } } },
          { id: 'part-2', kind: 'potentiometer', x: 300, y: 130, connections: { signal: { type: 'adc', channel: 2 } } },
          { id: 'part-3', kind: 'button', x: 520, y: 140, connections: {} },
        ],
      },
    })
  })
  it('wijzigt de invoer niet', () => {
    const copy = JSON.parse(JSON.stringify(FASE1_JSON))
    parseProject(FASE1_JSON)
    expect(FASE1_JSON).toEqual(copy)
  })
  it('een versie-1-bestand met een kapotte verbinding wordt nog steeds geweigerd', () => {
    const bad = { ...FASE1_JSON, parts: [{ ...FASE1_JSON.parts[0], connection: { type: 'pin', physical: 99 } }] }
    expect(parseProject(bad).ok).toBe(false)
  })
  it('bewaren geeft altijd versie 2', () => {
    const r = parseProject(FASE1_JSON)
    expect(r.ok && JSON.parse(serializeProject(r.value)).version).toBe(2)
  })
})
