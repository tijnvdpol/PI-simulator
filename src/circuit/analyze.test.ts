import { describe, expect, it } from 'vitest'
import { analyze, type AnalyzeInputs, type AnalysisResult } from './analyze'
import { railId } from './breadboard'
import type { Circuit, ProPart, ProWire } from './types'

let n = 0
const w = (a: string, b: string): ProWire => ({ id: `w${n++}`, a, b, color: 'blue' })

/**
 * Led in een kring: pin 11 (GPIO17) → [weerstand] → led → pin 6 (GND).
 * Normaal: weerstand op h:a5–h:a9, led anode h:b9 en kathode h:b10. `flip`: de led zit andersom.
 */
function ledCircuit(o: { ohm?: number; flip?: boolean; src?: string; gnd?: string | null } = {}): Circuit {
  const flip = o.flip ?? false
  const src = o.src ?? 'pin:11'
  const hi = flip ? 'h:c10' : 'h:c9'
  const lo = flip ? 'h:c9' : 'h:c10'
  const parts: ProPart[] = [{ id: 'led', kind: 'led', col: 9, row: 1, rot: 0 }]
  const wires: ProWire[] = []
  if (o.ohm === undefined) {
    wires.push(w(src, hi))
  } else {
    const c = flip ? 6 : 5
    parts.push({ id: 'r', kind: 'resistor', col: c, row: 0, rot: 0, resistance: o.ohm })
    wires.push(w(src, `h:b${c}`))
  }
  if (o.gnd !== null) wires.push(w(o.gnd ?? 'pin:6', lo))
  return { parts, wires }
}

const out = (g: number, level = 1): AnalyzeInputs => ({ gpio: { [g]: { mode: 'out', level } } })
const led = (r: AnalysisResult) => r.parts.led

describe('led in een complete kring', () => {
  it('brandt met I = (3,3 − 2) / R', () => {
    const r = analyze(ledCircuit({ ohm: 330 }), out(17))
    expect(led(r).status).toBe('on')
    expect(led(r).mA).toBeCloseTo((1.3 / 330) * 1000, 1)
    expect(led(r).level).toBeGreaterThan(0.3)
    expect(r.issues).toEqual([])
    expect(r.short).toBe(false)
  })
  it('is uit als de GPIO laag is, zonder meldingen', () => {
    const r = analyze(ledCircuit({ ohm: 330 }), out(17, 0))
    expect(led(r).status).toBe('off')
    expect(led(r).mA).toBe(0)
    expect(r.issues).toEqual([])
  })
  it('een pin die nog geen uitgang is (programma staat uit) laat de led uit zonder te klagen', () => {
    const r = analyze(ledCircuit({ ohm: 330 }))
    expect(led(r).status).toBe('off')
    expect(r.issues).toEqual([])
  })
  it('PWM: de helderheid schaalt met de duty-waarde', () => {
    const full = led(analyze(ledCircuit({ ohm: 330 }), out(17, 1))).level
    const half = led(analyze(ledCircuit({ ohm: 330 }), out(17, 0.5))).level
    expect(half).toBeCloseTo(full / 2, 5)
  })
  it('een led op 3V3 via een weerstand brandt altijd', () => {
    const r = analyze(ledCircuit({ ohm: 1000, src: 'pin:1' }))
    expect(led(r).status).toBe('on')
    expect(led(r).mA).toBeCloseTo(1.3, 1)
  })
  it('een grotere weerstand geeft minder stroom en een zwakkere led', () => {
    const a = led(analyze(ledCircuit({ ohm: 220 }), out(17)))
    const b = led(analyze(ledCircuit({ ohm: 4700 }), out(17)))
    expect(b.mA).toBeLessThan(a.mA)
    expect(b.level).toBeLessThan(a.level)
  })
  it('twee leds in serie op 3,3 V (2 × 2 V) branden niet', () => {
    const c: Circuit = {
      parts: [
        { id: 'led', kind: 'led', col: 9, row: 1, rot: 0 },
        { id: 'led2', kind: 'led', col: 14, row: 1, rot: 0 },
        { id: 'r', kind: 'resistor', col: 5, row: 0, rot: 0, resistance: 100 },
      ],
      wires: [w('pin:11', 'h:b5'), w('h:c10', 'h:c14'), w('h:c15', 'pin:6')],
    }
    const r = analyze(c, out(17))
    expect(r.parts.led.status).not.toBe('on')
    expect(r.parts.led2.status).not.toBe('on')
  })
})

describe('open kring', () => {
  it('zonder GND-draad: de led blijft uit met een hint over de losse poot', () => {
    const r = analyze(ledCircuit({ ohm: 330, gnd: null }), out(17))
    expect(led(r).status).toBe('open')
    expect(led(r).hint).toMatch(/kathode/)
    expect(r.issues.some((i) => i.partId === 'led')).toBe(true)
  })
  it('zonder draad naar de pin', () => {
    const c = ledCircuit({ ohm: 330 })
    c.wires = c.wires.filter((x) => x.a !== 'pin:11')
    const r = analyze(c, out(17))
    expect(led(r).status).toBe('open')
    expect(led(r).hint).toBeTruthy()
  })
  it('een lege schakeling geeft geen resultaten of meldingen', () => {
    const r = analyze({ parts: [], wires: [] })
    expect(r.parts).toEqual({})
    expect(r.issues).toEqual([])
  })
})

describe('led verkeerd om', () => {
  it('blijft uit en geeft een hint over de lange en korte poot', () => {
    const r = analyze(ledCircuit({ ohm: 330, flip: true }), out(17))
    expect(led(r).status).toBe('reversed')
    expect(led(r).mA).toBe(0)
    expect(led(r).hint).toMatch(/lange poot/)
    expect(led(r).hint).toMatch(/korte poot/)
    expect(r.issues.find((i) => i.partId === 'led')?.severity).toBe('waarschuwing')
  })
  it('ook zonder dat het programma draait', () => {
    expect(led(analyze(ledCircuit({ ohm: 330, flip: true }))).status).toBe('reversed')
  })
  it('geen doorbranden als hij verkeerd om zit zonder weerstand', () => {
    const r = analyze(ledCircuit({ flip: true }), out(17))
    expect(led(r).status).toBe('reversed')
    expect(r.newlyBurnt).toEqual([])
  })
})

describe('geen of te lage weerstand', () => {
  it('geen weerstand: de led brandt door', () => {
    const r = analyze(ledCircuit(), out(17))
    expect(led(r).status).toBe('burnt')
    expect(r.newlyBurnt).toEqual(['led'])
    const issue = r.issues.find((i) => i.partId === 'led')!
    expect(issue.severity).toBe('fout')
    expect(issue.message).toMatch(/weerstand/)
  })
  it('een doorgebrande led blijft kapot en meldt niet opnieuw', () => {
    const r = analyze(ledCircuit(), { ...out(17), burnt: new Set(['led']) })
    expect(led(r).status).toBe('burnt')
    expect(led(r).level).toBe(0)
    expect(r.newlyBurnt).toEqual([])
  })
  it('een doorgebrande led geeft geen stroom meer door', () => {
    const r = analyze(ledCircuit({ ohm: 330 }), { ...out(17), burnt: new Set(['led']) })
    expect(led(r).level).toBe(0)
    expect(led(r).status).toBe('burnt')
  })
  it('te lage weerstand (47 Ω → ~28 mA): waarschuwing voor de Pi, led nog heel', () => {
    const r = analyze(ledCircuit({ ohm: 47 }), out(17))
    expect(led(r).status).toBe('on')
    expect(led(r).mA).toBeCloseTo(27.6, 0)
    const warn = r.issues.find((i) => i.id === 'gpio-17-current')!
    expect(warn.severity).toBe('waarschuwing')
    expect(warn.message).toMatch(/echte Pi beschadigen/)
    expect(r.newlyBurnt).toEqual([])
  })
  it('100 Ω (13 mA) geeft geen waarschuwing, 75 Ω (17 mA) wel', () => {
    expect(analyze(ledCircuit({ ohm: 100 }), out(17)).issues).toEqual([])
    expect(analyze(ledCircuit({ ohm: 75 }), out(17)).issues.some((i) => i.id === 'gpio-17-current')).toBe(true)
  })
  it('22 Ω (~59 mA): de led brandt door', () => {
    const r = analyze(ledCircuit({ ohm: 22 }), out(17))
    expect(r.newlyBurnt).toEqual(['led'])
  })
  it('op 3V3 zonder weerstand brandt de led ook door', () => {
    expect(analyze(ledCircuit({ src: 'pin:1' })).newlyBurnt).toEqual(['led'])
  })
})

describe('kortsluiting', () => {
  const short = (a: string, b: string): Circuit => ({ parts: [], wires: [w(a, b)] })
  it('3V3 direct op GND', () => {
    const r = analyze(short('pin:1', 'pin:6'))
    expect(r.short).toBe(true)
    const i = r.issues.find((x) => x.id === 'short')!
    expect(i.severity).toBe('fout')
    expect(i.message).toMatch(/Kortsluiting/)
    expect(i.message).toMatch(/3,3V/)
    expect(i.message).toMatch(/GND/)
  })
  it('5V direct op GND', () => {
    expect(analyze(short('pin:2', 'pin:9')).short).toBe(true)
  })
  it('3V3 op 5V', () => {
    expect(analyze(short('pin:1', 'pin:2')).short).toBe(true)
  })
  it('via de rails van het breadboard', () => {
    const c: Circuit = { parts: [], wires: [w('pin:1', railId('t+', 1)), w('pin:6', railId('t-', 1)), w(railId('t+', 5), railId('t-', 5))] }
    expect(analyze(c).short).toBe(true)
  })
  it('een hoge GPIO op GND is een kortsluiting, een lage niet', () => {
    expect(analyze(short('pin:11', 'pin:6'), out(17, 1)).short).toBe(true)
    expect(analyze(short('pin:11', 'pin:6'), out(17, 0)).short).toBe(false)
    expect(analyze(short('pin:11', 'pin:6')).short).toBe(false)
  })
  it('een ingedrukte knop tussen 3V3 en GND', () => {
    const c: Circuit = {
      parts: [{ id: 'b', kind: 'button', col: 10, row: 4, rot: 0 }],
      wires: [w('pin:1', 'h:a10'), w('pin:6', 'h:j10')],
    }
    expect(analyze(c, { pressed: { b: false } }).short).toBe(false)
    expect(analyze(c, { pressed: { b: true } }).short).toBe(true)
  })
  it('een weerstand tussen 3V3 en GND is geen kortsluiting', () => {
    const c: Circuit = {
      parts: [{ id: 'r', kind: 'resistor', col: 5, row: 0, rot: 0, resistance: 1000 }],
      wires: [w('pin:1', 'h:b5'), w('pin:6', 'h:b9')],
    }
    expect(analyze(c).short).toBe(false)
  })
})

/** Knop over de middenspleet (h:e10–h:f12): bovenste helft h:a10, onderste h:j10. GPIO27 (pin 13) op de bovenkant. */
function buttonCircuit(bottom: string): Circuit {
  return {
    parts: [{ id: 'b', kind: 'button', col: 10, row: 4, rot: 0 }],
    wires: [w('pin:13', 'h:a10'), w(bottom, 'h:j10')],
  }
}

describe('knoppen met pull-up en pull-down', () => {
  it('pull-up, knop naar GND: hoog los, laag ingedrukt', () => {
    const c = buttonCircuit('pin:6')
    const mode = { 27: { mode: 'in' as const, pull: 'up' as const } }
    expect(analyze(c, { gpio: mode, pressed: { b: false } }).gpioLevel[27]).toBe(true)
    expect(analyze(c, { gpio: mode, pressed: { b: true } }).gpioLevel[27]).toBe(false)
  })
  it('pull-down, knop naar 3V3: laag los, hoog ingedrukt', () => {
    const c = buttonCircuit('pin:1')
    const mode = { 27: { mode: 'in' as const, pull: 'down' as const } }
    expect(analyze(c, { gpio: mode, pressed: { b: false } }).gpioLevel[27]).toBe(false)
    expect(analyze(c, { gpio: mode, pressed: { b: true } }).gpioLevel[27]).toBe(true)
  })
  it('pull-down met knop naar GND: nooit hoog (verkeerde combinatie)', () => {
    const c = buttonCircuit('pin:6')
    const mode = { 27: { mode: 'in' as const, pull: 'down' as const } }
    expect(analyze(c, { gpio: mode, pressed: { b: true } }).gpioLevel[27]).toBe(false)
  })
  it('pull-up met knop naar 3V3: altijd hoog', () => {
    const c = buttonCircuit('pin:1')
    const mode = { 27: { mode: 'in' as const, pull: 'up' as const } }
    expect(analyze(c, { gpio: mode, pressed: { b: true } }).gpioLevel[27]).toBe(true)
    expect(analyze(c, { gpio: mode, pressed: { b: false } }).gpioLevel[27]).toBe(true)
  })
  it('zonder pull is een los gelaten ingang laag; met de knop naar 3V3 hoog', () => {
    const c = buttonCircuit('pin:1')
    const mode = { 27: { mode: 'in' as const, pull: 'none' as const } }
    expect(analyze(c, { gpio: mode, pressed: { b: false } }).gpioLevel[27]).toBe(false)
    expect(analyze(c, { gpio: mode, pressed: { b: true } }).gpioLevel[27]).toBe(true)
  })
  it('de knop weet op welke GPIO hij zit', () => {
    const r = analyze(buttonCircuit('pin:6'))
    expect(r.attached[27]).toEqual({ kind: 'button', partId: 'b' })
  })
  it('een 90° gedraaide knop sluit de kring altijd (de verbonden poten liggen over de spleet)', () => {
    const c = buttonCircuit('pin:6')
    c.parts[0] = { ...c.parts[0], rot: 1 }
    const mode = { 27: { mode: 'in' as const, pull: 'up' as const } }
    expect(analyze(c, { gpio: mode, pressed: { b: false } }).gpioLevel[27]).toBe(false)
  })
})

describe('welk onderdeel zit op welke GPIO', () => {
  it('een led achter een weerstand hoort bij de GPIO', () => {
    expect(analyze(ledCircuit({ ohm: 330 })).attached[17]).toEqual({ kind: 'led', partId: 'led' })
  })
  it('een led direct op de pin ook', () => {
    expect(analyze(ledCircuit()).attached[17]).toEqual({ kind: 'led', partId: 'led' })
  })
  it('een led op 3V3 hoort bij geen GPIO', () => {
    expect(analyze(ledCircuit({ ohm: 330, src: 'pin:1' })).attached).toEqual({})
  })
  it('drie leds met een gedeelde min-rail: elk bij zijn eigen GPIO', () => {
    const parts: ProPart[] = []
    const wires: ProWire[] = [w('pin:6', railId('t-', 1))]
    const pins = [11, 13, 15]
    pins.forEach((pin, i) => {
      const c = 3 + i * 9
      parts.push({ id: `r${i}`, kind: 'resistor', col: c, row: 0, rot: 0, resistance: 330 })
      parts.push({ id: `l${i}`, kind: 'led', col: c + 4, row: 1, rot: 0 })
      wires.push(w(`pin:${pin}`, `h:b${c}`), w(railId('t-', 2 + i), `h:c${c + 5}`))
    })
    const r = analyze({ parts, wires }, { gpio: { 17: { mode: 'out', level: 1 }, 27: { mode: 'out', level: 0 }, 22: { mode: 'out', level: 0 } } })
    expect(r.attached[17]?.partId).toBe('l0')
    expect(r.attached[27]?.partId).toBe('l1')
    expect(r.attached[22]?.partId).toBe('l2')
    expect(r.parts.l0.status).toBe('on')
    expect(r.parts.l1.status).toBe('off')
    expect(r.parts.l2.status).toBe('off')
  })
})

describe('buzzer', () => {
  const buzzer = (flip: boolean): Circuit => ({
    parts: [{ id: 'z', kind: 'buzzer', col: 8, row: 0, rot: 0 }],
    wires: [w('pin:12', flip ? 'h:b11' : 'h:b8'), w('pin:6', flip ? 'h:b8' : 'h:b11')],
  })
  it('klinkt als de plus aan de GPIO zit', () => {
    const r = analyze(buzzer(false), out(18))
    expect(r.parts.z.status).toBe('on')
    expect(r.parts.z.level).toBe(1)
    expect(r.attached[18]).toEqual({ kind: 'buzzer', partId: 'z' })
  })
  it('zwijgt als hij verkeerd om zit', () => {
    const r = analyze(buzzer(true), out(18))
    expect(r.parts.z.status).toBe('reversed')
    expect(r.parts.z.level).toBe(0)
  })
})

describe('analoge sensoren', () => {
  const temp = (o: { powered?: boolean } = {}): Circuit => ({
    parts: [{ id: 't', kind: 'temperature', col: 8, row: 0, rot: 0 }],
    wires: [
      w(o.powered === false ? 'pin:6' : 'pin:1', 'h:b8'),
      w('adc:0', 'h:b9'),
      w('pin:6', 'h:b10'),
    ],
  })
  it('met voeding, aarde en uitgang op een kanaal geeft de sensor een waarde', () => {
    const r = analyze(temp(), { sensors: { t: 25 } })
    expect(r.analog[0]).toEqual({ partId: 't', kind: 'temperature', value: 25, powered: true })
  })
  it('zonder voeding meldt hij dat', () => {
    const r = analyze(temp({ powered: false }), { sensors: { t: 25 } })
    expect(r.analog[0].powered).toBe(false)
    expect(r.issues.find((i) => i.partId === 't')?.message).toMatch(/3V3/)
  })
  const pot = (flip: boolean): Circuit => ({
    parts: [{ id: 'p', kind: 'potentiometer', col: 8, row: 0, rot: 0 }],
    wires: [w(flip ? 'pin:6' : 'pin:1', 'h:b8'), w('adc:1', 'h:b9'), w(flip ? 'pin:1' : 'pin:6', 'h:b10')],
  })
  it('een potmeter geeft zijn stand, omgekeerd aangesloten de omgekeerde stand', () => {
    expect(analyze(pot(false), { sensors: { p: 0.25 } }).analog[1].value).toBeCloseTo(0.25)
    expect(analyze(pot(true), { sensors: { p: 0.25 } }).analog[1].value).toBeCloseTo(0.75)
  })
  it('standaardwaarden: 20 °C en halve stand', () => {
    expect(analyze(temp()).analog[0].value).toBe(20)
    expect(analyze(pot(false)).analog[1].value).toBe(0.5)
  })
})
