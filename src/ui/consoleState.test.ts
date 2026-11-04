import { describe, expect, it } from 'vitest'
import { MAX_LINES, appendCapped, consoleReducer, type ConsoleLine, type NewLine } from './consoleState'

describe('consoleReducer', () => {
  it('voegt regels toe met oplopende id en stroom', () => {
    let l: ConsoleLine[] = []
    l = consoleReducer(l, { type: 'out', text: 'a' })
    l = consoleReducer(l, { type: 'err', text: 'b' })
    expect(l.map((x) => [x.stream, x.text])).toEqual([['out', 'a'], ['err', 'b']])
    expect(l[1].id).toBeGreaterThan(l[0].id)
  })
  it('Review Focus 1: 5000 regels laten er precies 500 over (de laatste)', () => {
    let l: ConsoleLine[] = []
    for (let i = 0; i < 5000; i++) l = consoleReducer(l, { type: 'out', text: `regel ${i}` })
    expect(l).toHaveLength(MAX_LINES)
    expect(MAX_LINES).toBe(500)
    expect(l[0].text).toBe('regel 4500')
    expect(l[l.length - 1].text).toBe('regel 4999')
  })
  it('een batch van 5000 regels wordt ook begrensd', () => {
    const lines = Array.from({ length: 5000 }, (_, i) => ({ stream: 'out' as const, text: `r${i}` }))
    const l = consoleReducer([], { type: 'batch', lines })
    expect(l).toHaveLength(500)
    expect(l[499].text).toBe('r4999')
  })
  it('clear leegt de console', () => {
    expect(consoleReducer([{ id: 1, stream: 'out', text: 'x' }], { type: 'clear' })).toEqual([])
  })
  it('ids blijven uniek na clear', () => {
    let l = consoleReducer([], { type: 'out', text: 'a' })
    const first = l[0].id
    l = consoleReducer(l, { type: 'clear' })
    l = consoleReducer(l, { type: 'out', text: 'b' })
    expect(l[0].id).not.toBe(first)
  })
})

describe('appendCapped (wachtrij voor een verborgen tabblad)', () => {
  it('houdt de wachtrij op maximaal 500 regels, de nieuwste', () => {
    const q: NewLine[] = []
    for (let i = 0; i < 20_000; i++) appendCapped(q, { stream: 'out', text: `r${i}` })
    expect(q).toHaveLength(MAX_LINES)
    expect(q[0].text).toBe('r19500')
    expect(q[q.length - 1].text).toBe('r19999')
  })
})
