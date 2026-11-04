import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const COOP = 'same-origin'
const COEP = 'require-corp'

describe('COOP/COEP-headers', () => {
  it('staan in vercel.json voor alle routes', () => {
    const cfg = JSON.parse(readFileSync('vercel.json', 'utf8'))
    const rule = cfg.headers.find((h: { source: string }) => h.source === '/(.*)')
    const map = Object.fromEntries(rule.headers.map((h: { key: string; value: string }) => [h.key, h.value]))
    expect(map['Cross-Origin-Opener-Policy']).toBe(COOP)
    expect(map['Cross-Origin-Embedder-Policy']).toBe(COEP)
  })

  it('staan in vite.config.ts voor devserver en preview', async () => {
    const mod = await import('../vite.config')
    const cfg = (mod.default as unknown as { server: { headers: Record<string, string> }; preview: { headers: Record<string, string> } })
    for (const h of [cfg.server.headers, cfg.preview.headers]) {
      expect(h['Cross-Origin-Opener-Policy']).toBe(COOP)
      expect(h['Cross-Origin-Embedder-Policy']).toBe(COEP)
    }
  })
})
