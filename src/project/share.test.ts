import { describe, expect, it } from 'vitest'
import { buildShareUrl, decodeShare, encodeShare } from './share'
import { FASE1_SHARE_HASH } from './fase1Fixtures'
import { parseProject } from './parse'
import { FASE1_JSON } from './fase1Fixtures'
import type { Project } from './types'

const p: Project = {
  version: 2, name: 'Deel', code: 'from gpiozero import LED\nLED(17).on()\n',
  parts: [{ id: 'a', kind: 'led', x: 1, y: 2, color: 'red', connections: { signal: { type: 'pin', physical: 11 } } }],
}

describe('deellink', () => {
  it('roundtrip', () => {
    expect(decodeShare(`#p=${encodeShare(p)}`)).toEqual({ ok: true, value: p })
  })
  it('buildShareUrl eindigt op #p=…', () => {
    const url = buildShareUrl(p, 'https://example.com/')
    expect(url.startsWith('https://example.com/#p=')).toBe(true)
    expect(decodeShare(url.slice(url.indexOf('#')))).toEqual({ ok: true, value: p })
  })
  it('accepteert hash met of zonder #', () => {
    const e = encodeShare(p)
    expect(decodeShare(`#p=${e}`).ok).toBe(true)
    expect(decodeShare(`p=${e}`).ok).toBe(true)
  })
  it('kapotte of lege hash geeft Nederlandse fout', () => {
    for (const h of ['#p=@@kapot', '', '#', '#p=']) {
      const r = decodeShare(h)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.length).toBeGreaterThan(10)
    }
  })
  it('te nieuwe versie wordt netjes geweigerd', () => {
    const e = encodeShare({ ...p, version: 99 } as unknown as Project)
    const r = decodeShare(`#p=${e}`)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('nieuwere versie')
  })
  it('een deellink uit fase 1 opent automatisch en geeft hetzelfde project als de omgezette JSON', () => {
    const r = decodeShare(FASE1_SHARE_HASH)
    expect(r.ok).toBe(true)
    expect(r).toEqual(parseProject(FASE1_JSON))
    if (r.ok) expect(r.value.parts[0].connections.signal).toEqual({ type: 'pin', physical: 11 })
  })
})
