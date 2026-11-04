// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ExamplesMenu } from './ExamplesMenu'
import { PartsTray } from './PartsTray'
import { ShareDialog } from './ShareDialog'
import { CodeEditor } from './CodeEditor'
import { defaultDropPosition, VIEW_H, VIEW_W } from '../bench/partGeometry'
import type { Part } from '../project/types'

describe('onderdelenbak met toetsenbord', () => {
  it('kaartjes zijn focusbaar en Enter/spatie voegt het onderdeel toe', () => {
    const onAdd = vi.fn()
    render(<PartsTray onAdd={onAdd} />)
    const led = screen.getByLabelText(/^Led /)
    expect(led).toHaveAttribute('tabindex', '0')
    fireEvent.keyDown(led, { key: 'Enter' })
    fireEvent.keyDown(screen.getByLabelText(/^Knop /), { key: ' ' })
    expect(onAdd.mock.calls.map((c) => c[0])).toEqual(['led', 'button'])
  })
})

describe('defaultDropPosition', () => {
  it('geeft voor de eerste onderdelen verschillende plekken binnen het beeld, buiten de chip', () => {
    const parts: Part[] = []
    const seen = new Set<string>()
    for (let i = 0; i < 8; i++) {
      const p = defaultDropPosition(parts)
      expect(p.x).toBeGreaterThan(0); expect(p.x).toBeLessThan(VIEW_W)
      expect(p.y).toBeGreaterThan(0); expect(p.y).toBeLessThan(VIEW_H)
      expect(p.x < 410 || p.x > 600).toBe(true) // niet op de MCP3008-chip (x 430–580)
      seen.add(`${p.x},${p.y}`)
      parts.push({ id: `p${i}`, kind: 'led', x: p.x, y: p.y, connections: {} })
    }
    expect(seen.size).toBe(8)
  })
})

describe('dialogen', () => {
  it('ShareDialog sluit met Escape', () => {
    const onClose = vi.fn()
    render(<ShareDialog url="https://x/#p=1" onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
  it('focus blijft in de dialoog: Tab op het laatste element gaat naar het eerste', () => {
    render(<ExamplesMenu open onClose={() => {}} onPick={() => {}} />)
    const dialog = screen.getByRole('dialog')
    const focusables = Array.from(dialog.querySelectorAll<HTMLElement>('button'))
    const last = focusables[focusables.length - 1]
    last.focus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(document.activeElement).toBe(focusables[0])
    fireEvent.keyDown(focusables[0], { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })
  it('de dialoog zet de focus bij het openen naar binnen', () => {
    render(<ExamplesMenu open onClose={() => {}} onPick={() => {}} />)
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
  })
})

describe('code-editor', () => {
  it('heeft een toegankelijk label', () => {
    const { container } = render(<CodeEditor value="print(1)" onChange={() => {}} />)
    expect(container.querySelector('.cm-content')).toHaveAttribute('aria-label', 'Python-code')
  })
})
