// @vitest-environment jsdom
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { proLed } from '../examples/proExamples'
import { emptyProject } from '../project/types'
import { NewProjectDialog } from './NewProjectDialog'
import { ProIntroDialog, markProIntroSeen, proIntroSeen } from './ProIntroDialog'
import { ProPartsTray } from './ProPartsTray'
import { getDraggedKind, PRO_DRAG_TYPE, setDraggedKind } from './proDrag'
import { useProject } from './useProject'

describe('NewProjectDialog', () => {
  it('kiest Simpel of Pro', () => {
    const onCreate = vi.fn()
    render(<NewProjectDialog onCreate={onCreate} onClose={() => {}} />)
    const [simple, pro] = screen.getAllByRole('button', { name: /Maak/ })
    fireEvent.click(simple); fireEvent.click(pro)
    expect(onCreate.mock.calls.map((c) => c[0])).toEqual(['simple', 'pro'])
  })
  it('Escape sluit de dialoog', () => {
    const onClose = vi.fn()
    render(<NewProjectDialog onCreate={() => {}} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})

describe('uitleg over het breadboard', () => {
  it('legt rijen van 5, rails en de lange poot van de led uit, en sluit met Begrepen', () => {
    const onClose = vi.fn()
    render(<ProIntroDialog onClose={onClose} />)
    const dialog = screen.getByRole('dialog', { name: 'Wat is een breadboard?' })
    expect(dialog).toHaveTextContent(/Vijf gaatjes/)
    expect(dialog).toHaveTextContent(/rails/)
    expect(dialog).toHaveTextContent(/lange poot/)
    fireEvent.click(screen.getByRole('button', { name: 'Begrepen' }))
    expect(onClose).toHaveBeenCalled()
  })
  it('onthoudt dat je hem gezien hebt, ook als opslag niet werkt', () => {
    const data = new Map<string, string>()
    const store = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
    expect(proIntroSeen(store)).toBe(false)
    markProIntroSeen(store)
    expect(proIntroSeen(store)).toBe(true)
    const broken = { getItem: () => { throw new Error('geblokkeerd') }, setItem: () => { throw new Error('vol') } }
    expect(proIntroSeen(broken)).toBe(false)
    expect(() => markProIntroSeen(broken)).not.toThrow()
    expect(proIntroSeen(null)).toBe(false)
  })
})

describe('pro-onderdelenbak', () => {
  it('toont de zes onderdelen; Enter voegt toe; slepen onthoudt de soort', () => {
    const onAdd = vi.fn()
    render(<ProPartsTray onAdd={onAdd} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(6)
    fireEvent.keyDown(screen.getByLabelText(/^Weerstand/), { key: 'Enter' })
    expect(onAdd).toHaveBeenCalledWith('resistor')
    const setData = vi.fn()
    fireEvent.dragStart(screen.getByLabelText(/^Led/), { dataTransfer: { setData, effectAllowed: '' } })
    expect(setData).toHaveBeenCalledWith(PRO_DRAG_TYPE, 'led')
    expect(getDraggedKind()).toBe('led')
    fireEvent.dragEnd(screen.getByLabelText(/^Led/))
    expect(getDraggedKind()).toBeNull()
    setDraggedKind(null)
  })
})

describe('useProject met twee modi', () => {
  it('begint simpel en wisselt bij het laden van een pro-project', () => {
    const { result } = renderHook(() => useProject())
    expect(result.current.mode).toBe('simple')
    expect(result.current.project).toMatchObject({ version: 2, mode: 'simple', parts: [] })
    act(() => result.current.load(structuredClone(proLed)))
    expect(result.current.mode).toBe('pro')
    expect(result.current.project.mode).toBe('pro')
    expect(result.current.project.parts).toEqual([])
    expect(result.current.project.pro).toEqual(proLed.pro)
    act(() => result.current.load(emptyProject('simple')))
    expect(result.current.mode).toBe('simple')
    expect(result.current.project.pro).toBeUndefined()
  })
  it('wijzigingen aan het breadboard komen in het project, en undo werkt', () => {
    const { result } = renderHook(() => useProject(structuredClone(proLed)))
    expect(result.current.project.pro!.parts).toHaveLength(2)
    act(() => result.current.dispatchPro({ type: 'setResistance', id: 'p1', ohm: 1000 }))
    expect(result.current.project.pro!.parts[0].resistance).toBe(1000)
    act(() => result.current.dispatchPro({ type: 'undo' }))
    expect(result.current.project.pro!.parts[0].resistance).toBe(330)
  })
})
