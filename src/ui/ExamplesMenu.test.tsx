// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EXAMPLES } from '../examples'
import { ExamplesMenu } from './ExamplesMenu'

describe('ExamplesMenu', () => {
  it('toont niets als hij dicht is', () => {
    render(<ExamplesMenu open={false} onClose={() => {}} onPick={() => {}} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('toont de drie voorbeelden en kiest er één', () => {
    const onPick = vi.fn(), onClose = vi.fn()
    render(<ExamplesMenu open onClose={onClose} onPick={onPick} />)
    expect(screen.getAllByRole('button', { name: /Open/ })).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(EXAMPLES[1].titel) }))
    expect(onPick).toHaveBeenCalledWith(EXAMPLES[1].project)
    expect(onClose).toHaveBeenCalled()
  })
  it('Escape sluit het menu', () => {
    const onClose = vi.fn()
    render(<ExamplesMenu open onClose={onClose} onPick={() => {}} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
