// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { encodeShare } from '../project/share'
import { emptyProject, type Project } from '../project/types'
import { isDirty, useShareLinkListener, useUnsavedGuard } from './guards'
import { serializeProject } from '../project/parse'

const proj: Project = { ...emptyProject(), code: 'print(1)' }

describe('isDirty', () => {
  it('false voor een ongewijzigd project, true zodra code of onderdelen veranderen', () => {
    const base = serializeProject(proj)
    expect(isDirty(base, proj)).toBe(false)
    expect(isDirty(base, { ...proj, code: 'print(2)' })).toBe(true)
    expect(isDirty(base, { ...proj, parts: [{ id: 'a', kind: 'led', x: 0, y: 0, connection: null }] })).toBe(true)
  })
})

describe('useUnsavedGuard (verlies van werk bij verversen)', () => {
  it('vraagt om bevestiging bij het sluiten/verversen als er niet-opgeslagen werk is', () => {
    renderHook(() => useUnsavedGuard(true))
    const e = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
  })
  it('doet niets als alles is opgeslagen', () => {
    renderHook(() => useUnsavedGuard(false))
    const e = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(false)
  })
})

describe('useShareLinkListener (deellink in een al geopende tab)', () => {
  it('laadt het project bij een hashchange en haalt de hash uit de adresbalk', () => {
    const onProject = vi.fn(), onError = vi.fn()
    renderHook(() => useShareLinkListener(onProject, onError))
    window.location.hash = `#p=${encodeShare({ ...proj, code: 'uit de link' })}`
    act(() => { window.dispatchEvent(new HashChangeEvent('hashchange')) })
    expect(onProject).toHaveBeenCalledWith({ ...proj, code: 'uit de link' })
    expect(window.location.hash).toBe('')
    expect(onError).not.toHaveBeenCalled()
  })
  it('kapotte link → melding en geen project', () => {
    const onProject = vi.fn(), onError = vi.fn()
    renderHook(() => useShareLinkListener(onProject, onError))
    window.location.hash = '#p=@@kapot'
    act(() => { window.dispatchEvent(new HashChangeEvent('hashchange')) })
    expect(onProject).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('kapot'))
  })
  it('andere hashes worden genegeerd', () => {
    const onProject = vi.fn(), onError = vi.fn()
    renderHook(() => useShareLinkListener(onProject, onError))
    window.location.hash = '#iets-anders'
    act(() => { window.dispatchEvent(new HashChangeEvent('hashchange')) })
    expect(onProject).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })
})
