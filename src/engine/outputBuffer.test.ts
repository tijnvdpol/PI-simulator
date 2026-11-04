import { describe, expect, it } from 'vitest'
import { OutputBuffer, type OutLine } from './outputBuffer'

function setup(max = 500, intervalMs = 50) {
  let t = 0
  const posts: OutLine[][] = []
  const buf = new OutputBuffer((l) => posts.push(l), { intervalMs, max, now: () => t })
  return { buf, posts, tick: (ms: number) => { t += ms } }
}

describe('OutputBuffer (Review Focus 1)', () => {
  it('bundelt regels binnen het interval tot één bericht', () => {
    const { buf, posts, tick } = setup()
    buf.push('stdout', 'a') // eerste regel gaat meteen
    tick(1); buf.push('stdout', 'b')
    tick(1); buf.push('stdout', 'c')
    expect(posts).toEqual([[{ stream: 'stdout', text: 'a' }]])
    tick(60); buf.push('stdout', 'd')
    expect(posts[1].map((l) => l.text)).toEqual(['b', 'c', 'd'])
  })
  it('flush() stuurt de rest, en een lege buffer stuurt niets', () => {
    const { buf, posts, tick } = setup()
    buf.push('stdout', 'a'); tick(1); buf.push('stderr', 'b')
    buf.flush()
    expect(posts.at(-1)).toEqual([{ stream: 'stderr', text: 'b' }])
    const n = posts.length
    buf.flush()
    expect(posts).toHaveLength(n)
  })
  it('100.000 regels in één seconde geven hooguit ~25 berichten en de laatste regel komt aan', () => {
    const { buf, posts, tick } = setup()
    for (let i = 0; i < 100_000; i++) { if (i % 100 === 0) tick(1); buf.push('stdout', `r${i}`) }
    buf.flush()
    expect(posts.length).toBeLessThanOrEqual(25)
    expect(posts.every((p) => p.length <= 500)).toBe(true)
    expect(posts.at(-1)!.at(-1)!.text).toBe('r99999')
  })
  it('de buffer houdt maximaal `max` regels (de nieuwste)', () => {
    const { buf, posts } = setup(3, 1_000_000)
    buf.push('stdout', 'eerste') // gaat meteen
    for (const x of ['a', 'b', 'c', 'd', 'e']) buf.push('stdout', x)
    buf.flush()
    expect(posts.at(-1)!.map((l) => l.text)).toEqual(['c', 'd', 'e'])
  })
})
