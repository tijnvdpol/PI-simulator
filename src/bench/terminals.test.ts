import { describe, expect, it } from 'vitest'
import { PART_KINDS } from '../project/types'
import { TERMINALS, pinFit, suggestPin, terminalsOf } from './terminals'

const spec = (kind: Parameters<typeof terminalsOf>[0], id: string) => terminalsOf(kind).find((t) => t.id === id)!

describe('terminals', () => {
  it('elk soort heeft terminals met unieke id’s', () => {
    for (const k of PART_KINDS) {
      const ids = TERMINALS[k].map((t) => t.id)
      expect(ids.length).toBeGreaterThan(0)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
  it('de aansluitingen volgens de opdracht', () => {
    const ids = (k: Parameters<typeof terminalsOf>[0]) => terminalsOf(k).map((t) => t.id)
    expect(ids('led')).toEqual(['signal'])
    expect(ids('pwmled')).toEqual(['signal'])
    expect(ids('rgbled')).toEqual(['r', 'g', 'b', 'gnd'])
    expect(ids('servo')).toEqual(['signal', 'v5', 'gnd'])
    expect(ids('distance')).toEqual(['trigger', 'echo', 'v5', 'gnd'])
    expect(ids('oled')).toEqual(['sda', 'scl', 'v33', 'gnd'])
  })
  it('OLED: SDA alleen op pin 3 (GPIO 2), SCL alleen op pin 5 (GPIO 3), met uitleg', () => {
    expect(pinFit(spec('oled', 'sda'), 3)).toMatchObject({ ok: true, recommended: true })
    const bad = pinFit(spec('oled', 'sda'), 11)
    expect(bad.ok).toBe(false)
    expect(bad.reason).toMatch(/SDA/)
    expect(bad.reason).toMatch(/GPIO 2/)
    expect(pinFit(spec('oled', 'scl'), 5).ok).toBe(true)
    expect(pinFit(spec('oled', 'scl'), 3).ok).toBe(false)
  })
  it('voedingsterminals accepteren alleen de juiste soort pin', () => {
    expect(pinFit(spec('servo', 'v5'), 2).ok).toBe(true)
    expect(pinFit(spec('servo', 'v5'), 4).ok).toBe(true)
    const v33 = pinFit(spec('servo', 'v5'), 1)
    expect(v33.ok).toBe(false)
    expect(v33.reason).toMatch(/5V/)
    expect(pinFit(spec('oled', 'v33'), 1).ok).toBe(true)
    expect(pinFit(spec('oled', 'v33'), 2).ok).toBe(false)
    expect(pinFit(spec('rgbled', 'gnd'), 6).ok).toBe(true)
    expect(pinFit(spec('rgbled', 'gnd'), 11).ok).toBe(false)
  })
  it('gpio-terminals weigeren voeding, GND en ID-pinnen', () => {
    const r = spec('rgbled', 'r')
    expect(pinFit(r, 11).ok).toBe(true)
    expect(pinFit(r, 2).ok).toBe(false)
    expect(pinFit(r, 6).ok).toBe(false)
    expect(pinFit(r, 27).ok).toBe(false)
  })
  it('oude soorten zijn soepel: ook voeding/GND is kiesbaar (met waarschuwing later), ID niet', () => {
    const s = spec('led', 'signal')
    expect(pinFit(s, 6).ok).toBe(true)
    expect(pinFit(s, 2).ok).toBe(true)
    expect(pinFit(s, 27).ok).toBe(false)
  })
  it('voorstellen: eerste vrije pin uit de lijst', () => {
    expect(suggestPin(spec('oled', 'sda'), new Set())).toBe(3)
    expect(suggestPin(spec('rgbled', 'r'), new Set([11]))).not.toBe(11)
    expect(suggestPin(spec('led', 'signal'), new Set())).toBeNull()
  })
  it('voorgestelde pinnen zijn zelf altijd geschikt', () => {
    for (const k of PART_KINDS) for (const t of TERMINALS[k]) for (const p of t.suggest ?? []) expect(pinFit(t, p).ok, `${k}.${t.id} pin ${p}`).toBe(true)
  })
})
