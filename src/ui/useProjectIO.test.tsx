// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { decodeShare } from '../project/share'
import { loadLocal, saveLocal } from '../project/storage'
import { emptyProject, type Project } from '../project/types'
import { resolveInitial, useProjectIO } from './useProjectIO'
import { encodeShare } from '../project/share'

function memStore(): Storage {
  const m = new Map<string, string>()
  return { get length() { return m.size }, clear: () => m.clear(), getItem: (k) => m.get(k) ?? null, key: (i) => [...m.keys()][i] ?? null, removeItem: (k) => void m.delete(k), setItem: (k, v) => void m.set(k, v) }
}
const proj: Project = { ...emptyProject(), name: 'Mijn project', code: 'print(1)' }

function setup(over: Partial<Parameters<typeof useProjectIO>[0]> = {}) {
  const store = memStore()
  const deps = {
    project: proj, openProject: vi.fn(), toast: vi.fn(), store,
    href: 'https://pi.example/', clipboard: { writeText: vi.fn(async () => {}) }, saveBlob: vi.fn(), ...over,
  }
  const hook = renderHook(() => useProjectIO(deps))
  return { ...hook, deps, store }
}

describe('resolveInitial', () => {
  it('geldige #p=-hash laadt het gedeelde project', () => {
    expect(resolveInitial(`#p=${encodeShare(proj)}`, memStore())).toEqual({ project: proj, error: null })
  })
  it('Review Focus 3: kapotte hash → melding, localStorage ongemoeid', () => {
    const store = memStore()
    saveLocal(proj, store)
    const r = resolveInitial('#p=@@', store)
    expect(r.project).toBeNull()
    expect(r.error).toContain('kapot')
    expect(loadLocal(store)).toEqual({ ok: true, value: proj })
  })
  it('zonder hash: geen project en geen fout (opgeslagen werk wordt niet overschreven)', () => {
    expect(resolveInitial('', memStore())).toEqual({ project: null, error: null })
  })
})

describe('useProjectIO', () => {
  it('save schrijft naar localStorage en meldt het', () => {
    const { result, deps, store } = setup()
    act(() => result.current.save())
    expect(loadLocal(store)).toEqual({ ok: true, value: proj })
    expect(deps.toast).toHaveBeenCalledWith('Opgeslagen in je browser', 'ok')
  })
  it('onSaved wordt aangeroepen na opslaan en na downloaden (voor de "niet opgeslagen"-controle)', () => {
    const onSaved = vi.fn()
    const { result } = setup({ onSaved })
    act(() => result.current.save())
    act(() => result.current.download())
    expect(onSaved).toHaveBeenCalledTimes(2)
  })
  it('openLast zonder opslag → melding, geen openProject', () => {
    const { result, deps } = setup()
    act(() => result.current.openLast())
    expect(deps.toast).toHaveBeenCalledWith('Er is nog niets opgeslagen.', 'info')
    expect(deps.openProject).not.toHaveBeenCalled()
  })
  it('openLast met opslag opent het project', () => {
    const { result, deps, store } = setup()
    saveLocal({ ...proj, code: 'x' }, store)
    act(() => result.current.openLast())
    expect(deps.openProject).toHaveBeenCalledWith({ ...proj, code: 'x' })
  })
  it('openLast met beschadigd bestand → foutmelding en project ongemoeid', () => {
    const { result, deps, store } = setup()
    store.setItem('pi-simulator:project', '{kapot')
    act(() => result.current.openLast())
    expect(deps.openProject).not.toHaveBeenCalled()
    expect(deps.toast).toHaveBeenCalledWith(expect.stringContaining('beschadigd'), 'fout')
  })
  it('download geeft een bestandsnaam op basis van de projectnaam', () => {
    const { result, deps } = setup()
    act(() => result.current.download())
    expect(deps.saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'mijn-project.json')
  })
  it('importFile met geldig bestand opent het project', async () => {
    const { result, deps } = setup()
    await act(async () => { await result.current.importFile(new File([JSON.stringify(proj)], 'p.json')) })
    expect(deps.openProject).toHaveBeenCalledWith(proj)
  })
  it('importFile met ongeldig bestand → melding en project niet gewijzigd', async () => {
    const { result, deps } = setup()
    await act(async () => { await result.current.importFile(new File(['hallo'], 'p.json')) })
    expect(deps.openProject).not.toHaveBeenCalled()
    expect(deps.toast).toHaveBeenCalledWith(expect.stringContaining('geen geldig project'), 'fout')
  })
  it('share kopieert een #p=-link die hetzelfde project geeft', async () => {
    const { result, deps } = setup()
    await act(async () => { await result.current.share() })
    const url = (deps.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(url.startsWith('https://pi.example/#p=')).toBe(true)
    expect(decodeShare(url.slice(url.indexOf('#')))).toEqual({ ok: true, value: proj })
    expect(deps.toast).toHaveBeenCalledWith('Link gekopieerd', 'ok')
  })
  it('share valt terug op een tekstveld als het klembord weigert', async () => {
    const { result, deps } = setup({ clipboard: { writeText: vi.fn(async () => { throw new Error('nee') }) } })
    await act(async () => { await result.current.share() })
    expect(result.current.sharedUrl).toContain('#p=')
    expect(deps.toast).not.toHaveBeenCalledWith('Link gekopieerd', 'ok')
    act(() => result.current.closeShared())
    expect(result.current.sharedUrl).toBeNull()
  })
})
