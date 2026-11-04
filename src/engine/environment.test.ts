import { describe, expect, it } from 'vitest'
import { checkEnvironment } from './environment'

describe('checkEnvironment', () => {
  it('ok als de pagina cross-origin-isolated is en SharedArrayBuffer bestaat', () => {
    expect(checkEnvironment({ crossOriginIsolated: true, SharedArrayBuffer })).toEqual({ ok: true })
  })
  it('Review Focus 2: niet isolated → vriendelijke melding', () => {
    const r = checkEnvironment({ crossOriginIsolated: false, SharedArrayBuffer })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.melding).toContain('COOP/COEP')
  })
  it('geen SharedArrayBuffer → melding', () => {
    expect(checkEnvironment({ crossOriginIsolated: true }).ok).toBe(false)
  })
})
