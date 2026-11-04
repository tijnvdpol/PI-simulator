// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hasWebGL, resetWebGLCheck } from './webgl'
import { LazyBench3D, NoWebGLNotice, loadBench3D, preloadBench3D } from './LazyBench3D'

describe('hasWebGL', () => {
  beforeEach(() => resetWebGLCheck())
  it('test maar één keer en geeft de testcontext vrij: LazyBench3D roept dit bij elke render aan, en elke browser staat maar ~16 WebGL-contexten toe (daarna sneuvelt de echte werkbank)', () => {
    const real = document.createElement.bind(document)
    const lose = vi.fn()
    const made = vi.fn()
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, o?: ElementCreationOptions) => {
      const el = real(tag, o)
      if (tag === 'canvas') {
        made()
        ;(el as HTMLCanvasElement).getContext = (() => ({ getExtension: (n: string) => (n === 'WEBGL_lose_context' ? { loseContext: lose } : null) })) as never
      }
      return el
    })
    for (let i = 0; i < 50; i++) expect(hasWebGL()).toBe(true)
    expect(made).toHaveBeenCalledTimes(1)
    expect(lose).toHaveBeenCalledTimes(1)
    vi.restoreAllMocks()
  })
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
