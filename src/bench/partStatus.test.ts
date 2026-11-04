import { describe, expect, it } from 'vitest'
import type { Connections, Part, PartKind } from '../project/types'
import { isComplete, missingTerminals, partIssues } from './partStatus'

const pin = (physical: number) => ({ type: 'pin' as const, physical })
const part = (kind: PartKind, connections: Connections = {}, id = 'x'): Part => ({ id, kind, x: 0, y: 0, connections })

describe('partStatus', () => {
  it('compleet = alle aansluitingen aangesloten op geschikte pinnen', () => {
    expect(isComplete(part('servo', { signal: pin(12), v5: pin(2), gnd: pin(6) }))).toBe(true)
    expect(isComplete(part('servo', { signal: pin(12), gnd: pin(6) }))).toBe(false)
    expect(isComplete(part('oled', { sda: pin(11), scl: pin(5), v33: pin(1), gnd: pin(6) }))).toBe(false) // SDA op de verkeerde pin
    expect(isComplete(part('led', { signal: pin(11) }))).toBe(true)
    expect(isComplete(part('led'))).toBe(false)
  })
  it('missingTerminals noemt de ontbrekende aansluitingen in volgorde', () => {
    expect(missingTerminals(part('rgbled', { r: pin(11) })).map((t) => t.id)).toEqual(['g', 'b', 'gnd'])
  })
  it('servo zonder 5V → waarschuwing met uitleg waarom', () => {
    const issues = partIssues([part('servo', { signal: pin(12), gnd: pin(6) })])
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ partId: 'x', terminal: 'v5', code: 'no-power' })
    expect(issues[0].message).toContain('5V')
    expect(issues[0].message).toContain('servo')
    expect(issues[0].message).toMatch(/motor/)
  })
  it('ontbrekende aansluitingen → één melding per onderdeel met de namen erin', () => {
    const issues = partIssues([part('rgbled', { r: pin(11) })])
    expect(issues).toHaveLength(1)
    expect(issues[0].code).toBe('missing')
    expect(issues[0].message).toContain('Groen')
    expect(issues[0].message).toContain('GND')
  })
  it('OLED-SDA op een gewone pin → ongeschikt, met uitleg wat er nodig is', () => {
    const issues = partIssues([part('oled', { sda: pin(11), scl: pin(5), v33: pin(1), gnd: pin(6) })])
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ code: 'unsuitable', terminal: 'sda' })
    expect(issues[0].message).toContain('pin 3 (GPIO 2)')
  })
  it('een volledig aangesloten onderdeel geeft geen meldingen', () => {
    expect(partIssues([part('distance', { trigger: pin(16), echo: pin(18), v5: pin(4), gnd: pin(14) })])).toEqual([])
  })
  it('een nieuw losstaand onderdeel zonder pin krijgt een uitnodigende melding (ook de oude soorten)', () => {
    const issues = partIssues([part('led')])
    expect(issues).toHaveLength(1)
    expect(issues[0].code).toBe('missing')
    expect(issues[0].message).toContain('led')
  })
  it('een potmeter zonder kanaal ook', () => {
    expect(partIssues([part('potentiometer')])[0].message).toContain('potmeter')
  })
})
