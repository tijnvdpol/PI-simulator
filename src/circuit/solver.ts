/**
 * Een kleine gelijkstroom-oplosser (nodale analyse) voor weerstanden en leds.
 * Knooppunten zijn netten (tekst-id's). `fixed` zijn knooppunten met een vaste spanning (voeding, GPIO-uitgang).
 */
export interface Resistor { id: string; type: 'res'; a: string; b: string; ohm: number }
/** Led: ideale diode met drempelspanning `vf` en een kleine weerstand in geleiding. */
export interface Diode { id: string; type: 'diode'; a: string; b: string; vf: number; ron: number }
export type Element = Resistor | Diode

export interface Solution {
  voltage(node: string): number
  /** Stroom door het element, van a naar b, in ampère. */
  current(e: Element): number
  /** Staat de diode in geleiding? */
  conducting(id: string): boolean
}

const LEAK = 1e-9 // zwevende netten blijven oplosbaar

function gauss(a: number[][], b: number[]): number[] {
  const n = b.length
  for (let i = 0; i < n; i++) {
    let p = i
    for (let r = i + 1; r < n; r++) if (Math.abs(a[r][i]) > Math.abs(a[p][i])) p = r
    ;[a[i], a[p]] = [a[p], a[i]]
    ;[b[i], b[p]] = [b[p], b[i]]
    const d = a[i][i] || 1e-30
    for (let r = i + 1; r < n; r++) {
      const f = a[r][i] / d
      if (f === 0) continue
      for (let c = i; c < n; c++) a[r][c] -= f * a[i][c]
      b[r] -= f * b[i]
    }
  }
  const x = new Array<number>(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i]
    for (let c = i + 1; c < n; c++) s -= a[i][c] * x[c]
    x[i] = s / (a[i][i] || 1e-30)
  }
  return x
}

export function solve(elements: Element[], fixed: ReadonlyMap<string, number>): Solution {
  const nodes: string[] = []
  const index = new Map<string, number>()
  for (const e of elements) for (const n of [e.a, e.b]) {
    if (!fixed.has(n) && !index.has(n)) { index.set(n, nodes.length); nodes.push(n) }
  }
  const on = new Map<string, boolean>(elements.filter((e) => e.type === 'diode').map((e) => [e.id, false]))
  let volts = new Map<string, number>()
  const v = (n: string) => fixed.get(n) ?? volts.get(n) ?? 0

  const run = () => {
    const size = nodes.length
    const A = Array.from({ length: size }, () => new Array<number>(size).fill(0))
    const rhs = new Array<number>(size).fill(0)
    for (let i = 0; i < size; i++) A[i][i] += LEAK
    const stamp = (e: Element, g: number, inject: number) => {
      // stroom van a naar b = g (Va − Vb) − inject
      const ia = index.get(e.a)
      const ib = index.get(e.b)
      if (ia !== undefined) { A[ia][ia] += g; rhs[ia] += inject; if (ib !== undefined) A[ia][ib] -= g; else rhs[ia] += g * (fixed.get(e.b) ?? 0) }
      if (ib !== undefined) { A[ib][ib] += g; rhs[ib] -= inject; if (ia !== undefined) A[ib][ia] -= g; else rhs[ib] += g * (fixed.get(e.a) ?? 0) }
    }
    for (const e of elements) {
      if (e.type === 'res') stamp(e, 1 / e.ohm, 0)
      else if (on.get(e.id)) stamp(e, 1 / e.ron, e.vf / e.ron)
    }
    const x = size ? gauss(A, rhs) : []
    volts = new Map(nodes.map((n, i) => [n, x[i]]))
  }

  for (let iter = 0; iter < 40; iter++) {
    run()
    let changed = false
    for (const e of elements) {
      if (e.type !== 'diode') continue
      const vd = v(e.a) - v(e.b)
      const cur = on.get(e.id)!
      if (cur && (vd - e.vf) / e.ron < 0) { on.set(e.id, false); changed = true }
      else if (!cur && vd > e.vf) { on.set(e.id, true); changed = true }
    }
    if (!changed) break
  }

  return {
    voltage: v,
    current: (e) => {
      const vd = v(e.a) - v(e.b)
      if (e.type === 'res') return vd / e.ohm
      return on.get(e.id) ? (vd - e.vf) / e.ron : 0
    },
    conducting: (id) => on.get(id) === true,
  }
}
