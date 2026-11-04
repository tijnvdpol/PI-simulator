import { describe, expect, it } from 'vitest'
import { loadLocal, projectToBlob, readProjectFile, saveLocal } from './storage'
import { decodeShare, encodeShare } from './share'
import { emptyProject } from './types'

function memStore(): Storage {
  const m = new Map<string, string>()
  return {
    get length() { return m.size },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  }
}
const proj = { ...emptyProject(), name: 'Opgeslagen', code: 'print(1)' }

describe('localStorage', () => {
  it('roundtrip', () => {
    const s = memStore()
    saveLocal(proj, s)
    expect(loadLocal(s)).toEqual({ ok: true, value: proj })
  })
  it('niets opgeslagen → null', () => {
    expect(loadLocal(memStore())).toBeNull()
  })
  it('kapotte JSON → ok:false en overschrijft niets', () => {
    const s = memStore()
    s.setItem('pi-simulator:project', '{kapot')
    const r = loadLocal(s)
    expect(r && r.ok).toBe(false)
    expect(s.getItem('pi-simulator:project')).toBe('{kapot')
  })
})

describe('bestand', () => {
  it('blob → bestand → project roundtrip', async () => {
    const f = new File([projectToBlob(proj)], 'p.json')
    expect(await readProjectFile(f)).toEqual({ ok: true, value: proj })
  })
  it('geen JSON → ok:false', async () => {
    const r = await readProjectFile(new File(['hallo'], 'x.json'))
    expect(r.ok).toBe(false)
  })
  it('Review Focus 3: mislukte import van versie 99 laat opgeslagen project ongemoeid', async () => {
    const s = memStore()
    saveLocal(proj, s)
    const r = await readProjectFile(new File([JSON.stringify({ ...proj, version: 99 })], 'x.json'))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('nieuwere versie')
    expect(loadLocal(s)).toEqual({ ok: true, value: proj })
    expect(decodeShare(`#p=${encodeShare(proj)}`).ok).toBe(true)
  })
})
