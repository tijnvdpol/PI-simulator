import { PINS, pinByGpio } from '../pinout/pinout'
import { NET_3V3, NET_5V, NET_GND, buildNetlist, type Netlist } from './netlist'
import { LEGS } from './parts'
import { solve, type Element } from './solver'
import type { Circuit, ProKind, ProPart } from './types'

export const V_HIGH = 3.3
export const LED_VF = 2.0
export const LED_RON = 0.1
export const GPIO_WARN_MA = 16
export const LED_BURN_MA = 30
export const PULL_OHMS = 50_000
export const BUZZER_OHMS = 330
const CLOSED_OHMS = 0.01

export type GpioMode = { mode: 'out'; level: number } | { mode: 'in'; pull: 'up' | 'down' | 'none' }

export interface AnalyzeInputs {
  /** Per GPIO-nummer: uitgang (met niveau 0..1) of ingang (met pull-up/-down). Ontbrekend = ingang zonder pull. */
  gpio?: Record<number, GpioMode>
  /** Knoppen die nu ingedrukt zijn (per onderdeel-id). */
  pressed?: Record<string, boolean>
  /** Sensorwaarde per onderdeel-id: °C bij de temperatuursensor, 0..1 bij de potmeter. */
  sensors?: Record<string, number>
  /** Doorgebrande leds (per onderdeel-id). */
  burnt?: ReadonlySet<string>
}

export type PartStatus = 'ok' | 'on' | 'off' | 'open' | 'reversed' | 'burnt'

export interface PartResult { status: PartStatus; mA: number; /** 0..1: helderheid van de led of luid van de buzzer. */ level: number; hint?: string }
export interface Issue { id: string; severity: 'fout' | 'waarschuwing' | 'info'; partId?: string; message: string }
export interface AnalogReading { partId: string; kind: 'temperature' | 'potentiometer'; value: number; powered: boolean }

export interface AnalysisResult {
  parts: Record<string, PartResult>
  issues: Issue[]
  short: boolean
  /** Niveau van de GPIO-ingangen (hoog = true). */
  gpioLevel: Record<number, boolean>
  /** Welk digitaal onderdeel er (via weerstanden) aan een GPIO zit. */
  attached: Record<number, { kind: ProKind; partId: string }>
  /** Kanaal → wat de sensor daar levert. */
  analog: Record<number, AnalogReading>
  /** Leds die in deze analyse zijn doorgebrand. */
  newlyBurnt: string[]
}

const physicalOfGpio = (g: number) => pinByGpio(g)!.physical
const pinNet = (nl: Netlist, g: number) => nl.net(`pin:${physicalOfGpio(g)}`)

const BRIGHTNESS = (mA: number) => (mA < 0.05 ? 0 : Math.min(1, 0.25 + mA * 0.075))

const REVERSED_HINT =
  'De led zit verkeerd om en blijft daarom uit. Draai hem om: de lange poot (anode, +) moet naar de plus-kant (de GPIO-pin of 3V3), de korte poot (kathode, −) naar GND.'
const OPEN_HINT =
  'De kring is niet rond. Een led moet in een kring zitten van een GPIO-pin (of 3V3), via een weerstand en de led, terug naar GND.'

interface Pass {
  nl: Netlist
  elements: Element[]
  fixed: Map<string, number>
  sol: ReturnType<typeof solve>
  short: Issue | null
}

function legLabel(kind: ProKind, leg: string): string {
  return LEGS[kind].find((l) => l.name === leg)?.label ?? leg
}

/** Eén doorrekening van de schakeling met de gegeven GPIO-standen. */
function pass(circuit: Circuit, nl: Netlist, inputs: AnalyzeInputs, gpio: Record<number, GpioMode>): Pass {
  const burnt = inputs.burnt ?? new Set<string>()
  const fixed = new Map<string, number>()
  const claims = new Map<string, Map<number, string>>()
  const source = (net: string, volts: number, label: string) => {
    const m = claims.get(net) ?? new Map<number, string>()
    if (!m.has(volts)) m.set(volts, label)
    claims.set(net, m)
    if (!fixed.has(net)) fixed.set(net, volts)
  }
  source(nl.net(NET_3V3), V_HIGH, '3,3V')
  source(nl.net(NET_5V), 5, '5V')
  source(nl.net(NET_GND), 0, 'GND')
  const elements: Element[] = []
  for (const [gs, m] of Object.entries(gpio)) {
    const g = Number(gs)
    if (!pinByGpio(g)) continue
    if (m.mode === 'out') source(pinNet(nl, g), m.level > 0 ? V_HIGH : 0, `GPIO${g}`)
    else if (m.pull !== 'none') {
      const ref = `PULL:${m.pull}:${g}`
      fixed.set(ref, m.pull === 'up' ? V_HIGH : 0)
      elements.push({ id: `pull-${g}`, type: 'res', a: pinNet(nl, g), b: ref, ohm: PULL_OHMS })
    }
  }
  let short: Issue | null = null
  for (const m of claims.values()) {
    if (m.size > 1 && !short) {
      short = {
        id: 'short', severity: 'fout',
        message: `Kortsluiting! ${[...m.values()].join(' en ')} zijn direct met elkaar verbonden. Dat kan je echte Pi beschadigen. Haal de draad of het onderdeel weg dat dit veroorzaakt.`,
      }
    }
  }
  for (const p of circuit.parts) {
    const net = (l: string) => nl.legNet(p, l)
    if (p.kind === 'resistor') elements.push({ id: p.id, type: 'res', a: net('a'), b: net('b'), ohm: Math.max(CLOSED_OHMS, p.resistance ?? 330) })
    else if (p.kind === 'buzzer') elements.push({ id: p.id, type: 'res', a: net('plus'), b: net('min'), ohm: BUZZER_OHMS })
    else if (p.kind === 'led' && !burnt.has(p.id)) elements.push({ id: p.id, type: 'diode', a: net('anode'), b: net('kathode'), vf: LED_VF, ron: LED_RON })
    else if (p.kind === 'button' && inputs.pressed?.[p.id]) elements.push({ id: p.id, type: 'res', a: net('a'), b: net('c'), ohm: CLOSED_OHMS })
  }
  // Een knop (of draad) tussen twee verschillende vaste spanningen zonder weerstand: kortsluiting.
  for (const e of elements) {
    if (e.type === 'res' && e.ohm < 1 && fixed.has(e.a) && fixed.has(e.b) && fixed.get(e.a) !== fixed.get(e.b) && !short) {
      short = { id: 'short', severity: 'fout', message: 'Kortsluiting! Een knop sluit twee spanningen direct kort (bijvoorbeeld 3,3V op GND). Dat kan je echte Pi beschadigen. Zet er een weerstand tussen.' }
    }
  }
  return { nl, elements, fixed, sol: solve(elements, fixed), short }
}

/** GPIO-pinnen die in draden voorkomen: de kandidaten voor de "wat als deze pin hoog is"-proef. */
function probeGpios(circuit: Circuit): number[] {
  const out = new Set<number>()
  for (const w of circuit.wires) for (const t of [w.a, w.b]) {
    const m = /^pin:(\d+)$/.exec(t)
    const g = m ? PINS[Number(m[1]) - 1]?.gpio : null
    if (g !== null && g !== undefined) out.add(g)
  }
  return [...out]
}

export function analyze(circuit: Circuit, inputs: AnalyzeInputs = {}): AnalysisResult {
  const nl = buildNetlist(circuit)
  const gpio = inputs.gpio ?? {}
  const live = pass(circuit, nl, inputs, gpio)
  const result: AnalysisResult = { parts: {}, issues: [], short: false, gpioLevel: {}, attached: {}, analog: {}, newlyBurnt: [] }
  if (live.short) { result.short = true; result.issues.push(live.short) }

  // ── Welk digitaal onderdeel zit (via weerstanden) aan welke GPIO?
  const adj = new Map<string, Set<string>>()
  const link = (a: string, b: string) => {
    ;(adj.get(a) ?? adj.set(a, new Set()).get(a)!).add(b)
    ;(adj.get(b) ?? adj.set(b, new Set()).get(b)!).add(a)
  }
  for (const p of circuit.parts) if (p.kind === 'resistor') link(nl.legNet(p, 'a'), nl.legNet(p, 'b'))
  const powerNets = new Set([nl.net(NET_3V3), nl.net(NET_5V), nl.net(NET_GND)])
  const dutyOf = new Map<string, number>()
  for (const g of probeGpios(circuit)) {
    const start = pinNet(nl, g)
    if (powerNets.has(start)) continue
    const seen = new Set([start])
    const queue = [start]
    while (queue.length) {
      const cur = queue.pop()!
      for (const nxt of adj.get(cur) ?? []) {
        if (!seen.has(nxt) && !powerNets.has(nxt)) { seen.add(nxt); queue.push(nxt) }
      }
    }
    for (const p of circuit.parts) {
      if (p.kind !== 'led' && p.kind !== 'button' && p.kind !== 'buzzer') continue
      if (result.attached[g]) break
      if (LEGS[p.kind].some((l) => seen.has(nl.legNet(p, l.name)) && !powerNets.has(nl.legNet(p, l.name)))) {
        result.attached[g] = { kind: p.kind, partId: p.id }
      }
    }
    const a = result.attached[g]
    if (a) { const m = gpio[g]; dutyOf.set(a.partId, m?.mode === 'out' ? m.level : 1) }
  }

  // ── Ingangen: welk niveau ziet elke GPIO?
  for (const [gs, m] of Object.entries(gpio)) {
    if (m.mode === 'in') {
      const net = pinNet(nl, Number(gs))
      result.gpioLevel[Number(gs)] = live.sol.voltage(net) > V_HIGH / 2
    }
  }

  // ── Welke netten zijn "ergens aan vast"? (voor het herkennen van losse poten)
  const legCount = new Map<string, number>()
  for (const p of circuit.parts) for (const l of LEGS[p.kind]) {
    const n = nl.legNet(p, l.name)
    legCount.set(n, (legCount.get(n) ?? 0) + 1)
  }
  const pinNets = new Set<string>(powerNets)
  for (const w of circuit.wires) for (const t of [w.a, w.b]) if (/^(pin|adc):/.test(t)) pinNets.add(nl.net(t))
  const floating = (p: ProPart, leg: string) => {
    const n = nl.legNet(p, leg)
    return (legCount.get(n) ?? 0) <= 1 && !pinNets.has(n)
  }

  // ── Proef voor leds die niet branden: kan er ooit stroom komen, en zo ja de goede kant op?
  let probes: { lit: Set<string>; reverse: Set<string> } | null = null
  const probe = () => {
    if (probes) return probes
    const lit = new Set<string>()
    const reverse = new Set<string>()
    for (const g of probeGpios(circuit)) {
      const trial = pass(circuit, nl, inputs, { ...gpio, [g]: { mode: 'out', level: 1 } })
      for (const p of circuit.parts) {
        if (p.kind !== 'led' && p.kind !== 'buzzer') continue
        const [a, k] = p.kind === 'led' ? ['anode', 'kathode'] : ['plus', 'min']
        const vd = trial.sol.voltage(nl.legNet(p, a)) - trial.sol.voltage(nl.legNet(p, k))
        const e = trial.elements.find((x) => x.id === p.id)
        const mA = e ? trial.sol.current(e) * 1000 : 0
        if (mA >= (p.kind === 'led' ? 0.05 : 3)) lit.add(p.id)
        else if (vd < -0.5) reverse.add(p.id)
      }
    }
    probes = { lit, reverse }
    return probes
  }

  // ── Per onderdeel
  const gpioCurrent = new Map<number, number>()
  for (const [gs, m] of Object.entries(gpio)) {
    if (m.mode !== 'out') continue
    const net = pinNet(nl, Number(gs))
    let sum = 0
    for (const e of live.elements) {
      const i = live.sol.current(e)
      if (e.a === net) sum += i
      if (e.b === net) sum -= i
    }
    gpioCurrent.set(Number(gs), sum * 1000)
  }
  const burntNow = new Set<string>()

  for (const p of circuit.parts) {
    const e = live.elements.find((x) => x.id === p.id)
    const mA = e ? live.sol.current(e) * 1000 : 0
    const duty = dutyOf.get(p.id) ?? 1
    if (p.kind === 'led') {
      const [a, k] = [nl.legNet(p, 'anode'), nl.legNet(p, 'kathode')]
      if (inputs.burnt?.has(p.id)) { result.parts[p.id] = { status: 'burnt', mA: 0, level: 0, hint: 'Deze led is doorgebrand. Vervang hem door een nieuwe.' }; continue }
      if (mA > LED_BURN_MA) {
        burntNow.add(p.id)
        result.newlyBurnt.push(p.id)
        result.parts[p.id] = { status: 'burnt', mA, level: 0, hint: 'Deze led is doorgebrand. Gebruik altijd een weerstand (bijvoorbeeld 330 Ω) in serie met een led.' }
        result.issues.push({ id: `${p.id}-burnt`, severity: 'fout', partId: p.id, message: `Je led is doorgebrand! Er liep ${Math.round(mA)} mA door, veel meer dan een led aankan. Zet een weerstand (bijvoorbeeld 330 Ω) in serie met de led en vervang hem door een nieuwe.` })
        continue
      }
      if (mA >= 0.05) { result.parts[p.id] = { status: 'on', mA, level: BRIGHTNESS(mA) * duty }; continue }
      const vd = live.sol.voltage(a) - live.sol.voltage(k)
      let status: PartStatus = 'off'
      let hint: string | undefined
      const pr = probe()
      const loose = floating(p, 'anode') ? 'anode' : floating(p, 'kathode') ? 'kathode' : null
      if (vd < -0.5 || (!pr.lit.has(p.id) && pr.reverse.has(p.id))) { status = 'reversed'; hint = REVERSED_HINT }
      else if (!pr.lit.has(p.id)) {
        status = 'open'
        hint = loose ? `De ${legLabel('led', loose)} van de led zit nergens aan vast. ${OPEN_HINT}` : OPEN_HINT
      }
      result.parts[p.id] = { status, mA: 0, level: 0, hint }
      if (hint) result.issues.push({ id: `${p.id}-${status}`, severity: status === 'reversed' ? 'waarschuwing' : 'info', partId: p.id, message: hint })
    } else if (p.kind === 'buzzer') {
      if (mA >= 3) result.parts[p.id] = { status: 'on', mA, level: duty }
      else if (mA <= -3 || (!probe().lit.has(p.id) && probe().reverse.has(p.id))) {
        const hint = 'De buzzer zit verkeerd om en zwijgt. De plus (+) moet naar de GPIO-pin, de min (−) naar GND.'
        result.parts[p.id] = { status: 'reversed', mA: 0, level: 0, hint }
        result.issues.push({ id: `${p.id}-reversed`, severity: 'waarschuwing', partId: p.id, message: hint })
      } else result.parts[p.id] = { status: 'off', mA: 0, level: 0 }
    } else {
      result.parts[p.id] = { status: 'ok', mA: 0, level: 0 }
    }
  }

  // ── Te veel stroom uit één GPIO
  for (const [g, mA] of gpioCurrent) {
    if (Math.abs(mA) <= GPIO_WARN_MA) continue
    const burntHere = [...burntNow].some((id) => result.attached[g]?.partId === id)
    if (burntHere) continue
    result.issues.push({
      id: `gpio-${g}-current`, severity: 'waarschuwing',
      message: `GPIO${g} (pin ${physicalOfGpio(g)}) levert nu ${Math.round(Math.abs(mA))} mA. Een GPIO-pin mag maar ongeveer ${GPIO_WARN_MA} mA leveren — dit kan je echte Pi beschadigen. Gebruik een grotere weerstand.`,
    })
  }

  // ── Analoge sensoren op een kanaal van de MCP3008
  const three = nl.net(NET_3V3)
  const five = nl.net(NET_5V)
  const gnd = nl.net(NET_GND)
  const isVcc = (n: string) => n === three || n === five
  for (let ch = 0; ch < 8; ch++) {
    const net = nl.net(`adc:${ch}`)
    for (const p of circuit.parts) {
      if (p.kind === 'temperature' && nl.legNet(p, 'out') === net) {
        const powered = isVcc(nl.legNet(p, 'vcc')) && nl.legNet(p, 'gnd') === gnd
        result.analog[ch] = { partId: p.id, kind: 'temperature', value: powered ? (inputs.sensors?.[p.id] ?? 20) : 0, powered }
        if (!powered) result.issues.push({ id: `${p.id}-power`, severity: 'waarschuwing', partId: p.id, message: 'De temperatuursensor krijgt geen stroom. Sluit VCC aan op 3V3 en GND op GND.' })
      } else if (p.kind === 'potentiometer' && nl.legNet(p, 'wiper') === net) {
        const e1 = nl.legNet(p, 'e1')
        const e2 = nl.legNet(p, 'e2')
        const pos = inputs.sensors?.[p.id] ?? 0.5
        const normal = isVcc(e1) && e2 === gnd
        const swapped = e1 === gnd && isVcc(e2)
        result.analog[ch] = { partId: p.id, kind: 'potentiometer', value: normal ? pos : swapped ? 1 - pos : 0, powered: normal || swapped }
        if (!normal && !swapped) result.issues.push({ id: `${p.id}-power`, severity: 'waarschuwing', partId: p.id, message: 'De potmeter krijgt geen stroom. Sluit het ene uiteinde op 3V3 en het andere op GND.' })
      }
    }
  }
  return result
}
