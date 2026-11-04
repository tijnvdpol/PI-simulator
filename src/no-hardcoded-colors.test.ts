import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

describe('thema-tokens', () => {
  it('geen #rrggbb-kleuren buiten src/styles/theme.css', () => {
    const offenders = walk('src')
      .filter((f) => /\.(tsx?|css|py)$/.test(f) && !f.endsWith('styles/theme.css') && !f.endsWith('no-hardcoded-colors.test.ts'))
      .filter((f) => /#[0-9a-fA-F]{6}\b/.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })

  it('theme.css bevat de verplichte tokens', () => {
    const css = readFileSync('src/styles/theme.css', 'utf8')
    for (const v of ['--color-bg: #1e1f22', '--color-panel: #2b2d31', '--color-line: #3a3c42', '--color-fg: #e8e6df', '--color-fg-muted: #a3a29b', '--color-board: #1d6b3a', '--color-gold: #ef9f27', '--color-accent: #5dcaa5', '--color-danger: #e24b4a', '--color-warning: #ef9f27']) {
      expect(css).toContain(v)
    }
  })
})
