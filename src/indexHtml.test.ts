// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

const html = readFileSync('index.html', 'utf8')
const load = (url: string) => new JSDOM(html, { url, runScripts: 'dangerously' }).window.document

describe('index.html fallback', () => {
  it('als los bestand (file://) staat er een Nederlandse uitleg in plaats van een lege pagina', () => {
    const doc = load('file:///home/x/dist/index.html')
    expect(doc.getElementById('root')!.textContent).toContain('niet als los bestand')
  })
  it('via http blijft #root leeg voor React', () => {
    expect(load('http://localhost:5173/').getElementById('root')!.textContent).toBe('')
  })
  it('heeft een <noscript> voor browsers zonder JavaScript', () => {
    expect(html).toContain('<noscript>')
  })
})
