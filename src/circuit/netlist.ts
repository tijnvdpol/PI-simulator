import { PINS } from '../pinout/pinout'
import { internalNet } from './breadboard'
import { INTERNAL_PAIRS, legPlaces, legTerminal } from './parts'
import type { Circuit, ProPart } from './types'

export const NET_3V3 = 'NET:3V3'
export const NET_5V = 'NET:5V'
export const NET_GND = 'NET:GND'

class UnionFind {
  private parent = new Map<string, string>()
  find(x: string): string {
    let p = this.parent.get(x)
    if (p === undefined) { this.parent.set(x, x); return x }
    let root = x
    while (p !== root) { root = p; p = this.parent.get(root)! }
    // padcompressie
    let cur = x
    while (cur !== root) { const next = this.parent.get(cur)!; this.parent.set(cur, root); cur = next }
    return root
  }
  union(a: string, b: string): void {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }
}

export interface Netlist {
  /** Net (wortel) van een terminal: een pin, gaatje, railgat, adc-kanaal of poot (`legTerminal`). */
  net(terminal: string): string
  legNet(part: ProPart, leg: string): string
  /** Zitten deze twee terminals aan hetzelfde net? */
  same(a: string, b: string): boolean
}

/** Bouwt de netlijst: pinnen, gaatjes, draden en onderdeelpoten die elektrisch samenvallen, met union-find. */
export function buildNetlist(circuit: Circuit): Netlist {
  const uf = new UnionFind()
  // De voedingspinnen van de Pi zijn onderling verbonden: alle GND's, beide 5V's en beide 3V3's.
  for (const p of PINS) {
    if (p.kind === '3v3') uf.union(`pin:${p.physical}`, NET_3V3)
    else if (p.kind === '5v') uf.union(`pin:${p.physical}`, NET_5V)
    else if (p.kind === 'gnd') uf.union(`pin:${p.physical}`, NET_GND)
  }
  for (const w of circuit.wires) {
    uf.union(w.a, w.b)
  }
  for (const part of circuit.parts) {
    for (const leg of legPlaces(part)) {
      uf.union(legTerminal(part.id, leg.name), leg.hole)
    }
    for (const [a, b] of INTERNAL_PAIRS[part.kind] ?? []) uf.union(legTerminal(part.id, a), legTerminal(part.id, b))
  }
  // Gaatjes zijn intern verbonden (rij van 5, rail): elk gaatje hoort bij het net met de naam van zijn interne groep.
  const find = (t: string): string => {
    const n = internalNet(t)
    return uf.find(n ?? t)
  }
  for (const w of circuit.wires) { uf.union(w.a, internalNet(w.a) ?? w.a); uf.union(w.b, internalNet(w.b) ?? w.b) }
  for (const part of circuit.parts) for (const l of legPlaces(part)) uf.union(l.hole, internalNet(l.hole)!)
  return {
    net: find,
    legNet: (part, leg) => find(legTerminal(part.id, leg)),
    same: (a, b) => find(a) === find(b),
  }
}
