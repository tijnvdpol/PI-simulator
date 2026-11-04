// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { hasWebGL } from './webgl'
import { LazyBench3D, NoWebGLNotice, loadBench3D, preloadBench3D } from './LazyBench3D'

describe('hasWebGL', () => {
  it('is false als de browser geen WebGL-context geeft (jsdom)', () => {
    expect(hasWebGL()).toBe(false)
  })
  it('is true als een canvas een context geeft', () => {
    const real = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, o?: ElementCreationOptions) => {
      const el = real(tag, o)
      if (tag === 'canvas') (el as HTMLCanvasElement).getContext = (() => ({})) as never
      return el
    })
    expect(hasWebGL()).toBe(true)
    vi.restoreAllMocks()
  })
  it('vangt fouten van getContext op', () => {
    const real = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, o?: ElementCreationOptions) => {
      const el = real(tag, o)
      if (tag === 'canvas') (el as HTMLCanvasElement).getContext = (() => { throw new Error('nee') }) as never
      return el
    })
    expect(hasWebGL()).toBe(false)
    vi.restoreAllMocks()
  })
})

describe('LazyBench3D', () => {
  it('preloadBench3D laadt niets zonder WebGL', () => {
    expect(preloadBench3D()).toBeNull()
  })
  it('toont zonder WebGL een Nederlandse melding en laadt de 3D-code niet', () => {
    render(<LazyBench3D parts={[]} connecting={null} error={null} locked={false} dispatch={() => {}}><p>kind</p></LazyBench3D>)
    expect(screen.getByRole('alert')).toHaveTextContent('3D wordt niet ondersteund')
    expect(screen.getByText('kind')).toBeInTheDocument()
  })
  it('de kinderen (lege-staat-uitnodiging) staan ook tijdens het laden van de 3D-code al in beeld', async () => {
    vi.resetModules()
    vi.doMock('./webgl', () => ({ hasWebGL: () => true }))
    vi.doMock('./Bench3D', () => new Promise(() => {})) // laadt nooit klaar
    const { LazyBench3D: L } = await import('./LazyBench3D')
    render(<L parts={[]} connecting={null} error={null} locked={false} dispatch={() => {}}><p>uitnodiging</p></L>)
    expect(screen.getByText('uitnodiging')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('3D-werkbank wordt geladen')
    vi.doUnmock('./webgl'); vi.doUnmock('./Bench3D')
  })
  it('NoWebGLNotice legt uit wat er mis is', () => {
    render(<NoWebGLNotice />)
    expect(screen.getByRole('alert')).toHaveTextContent(/WebGL/)
  })
  it('loadBench3D geeft steeds dezelfde belofte (voorladen naast Pyodide)', () => {
    expect(loadBench3D()).toBe(loadBench3D())
  })
})
