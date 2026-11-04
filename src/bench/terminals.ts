import { PINS, pinByPhysical, type PiPin } from '../pinout/pinout'
import type { PartKind } from '../project/types'

/**
 * Een aansluiting ("terminal") van een onderdeel. Eén onderdeel kan er meerdere hebben (servo: signaal + 5V + GND).
 * - `gpio`: een GPIO-pin van de Pi; `adc`: een kanaal van de MCP3008; `v5`/`v33`/`gnd`: voeding.
 * - `only`: alleen deze fysieke pinnen zijn geschikt (bijv. I²C); anders elke GPIO-pin.
 * - `suggest`: voorstellen in volgorde van voorkeur; de eerste vrije wordt voorgesteld.
 * - `lenient`: oude soorten (fase 1) laten ook voeding/GND toe; de werkbank waarschuwt dan achteraf.
 */
export interface TerminalSpec {
  id: string
  /** Korte naam voor in menu’s en labels ("SDA", "5V"). */
  label: string
  type: 'gpio' | 'adc' | 'v5' | 'v33' | 'gnd'
  only?: number[]
  suggest?: number[]
  lenient?: boolean
  /** Waarom deze aansluiting zo moet (voor de uitleg bij een ongeschikte pin). */
  why: string
}

const signal = (why: string, extra: Partial<TerminalSpec> = {}): TerminalSpec => ({ id: 'signal', label: 'Signaal', type: 'gpio', why, ...extra })
const gpio = (id: string, label: string, why: string, extra: Partial<TerminalSpec> = {}): TerminalSpec => ({ id, label, type: 'gpio', why, ...extra })
const v5 = (why: string): TerminalSpec => ({ id: 'v5', label: '5V', type: 'v5', suggest: [2, 4], why })
const v33 = (why: string): TerminalSpec => ({ id: 'v33', label: '3V3', type: 'v33', suggest: [1, 17], why })
const gnd = (why: string): TerminalSpec => ({ id: 'gnd', label: 'GND', type: 'gnd', suggest: [6, 9, 14, 20, 25, 30, 34, 39], why })

const OLD_WHY = 'Dit onderdeel wordt vanuit je code aangestuurd, dus het moet op een GPIO-pin.'
const GND_WHY = 'GND (aarde) is de min-kant van het circuit; zonder GND loopt er geen stroom.'

export const TERMINALS: Record<PartKind, TerminalSpec[]> = {
  led: [signal(OLD_WHY, { lenient: true })],
  button: [signal(OLD_WHY, { lenient: true })],
  buzzer: [signal(OLD_WHY, { lenient: true })],
  temperature: [{ id: 'signal', label: 'Kanaal', type: 'adc', why: 'Een analoge sensor wordt uitgelezen via een kanaal van de MCP3008-chip.' }],
  potentiometer: [{ id: 'signal', label: 'Kanaal', type: 'adc', why: 'Een analoge sensor wordt uitgelezen via een kanaal van de MCP3008-chip.' }],
  pwmled: [signal('Een PWM-led wordt gedimd door je code; hij moet op een GPIO-pin. Pin 12 (GPIO 18) heeft hardware-PWM en geeft de rustigste dimming.', { suggest: [12, 33, 32, 35] })],
  rgbled: [
    gpio('r', 'Rood', 'Elke kleur van de RGB-led heeft een eigen GPIO-pin, zodat je code de kleuren apart kan dimmen.', { suggest: [11] }),
    gpio('g', 'Groen', 'Elke kleur van de RGB-led heeft een eigen GPIO-pin, zodat je code de kleuren apart kan dimmen.', { suggest: [13] }),
    gpio('b', 'Blauw', 'Elke kleur van de RGB-led heeft een eigen GPIO-pin, zodat je code de kleuren apart kan dimmen.', { suggest: [15] }),
    gnd(GND_WHY),
  ],
  servo: [
    signal('Het stuursignaal van de servo komt van een GPIO-pin. Pin 12 (GPIO 18) heeft hardware-PWM en geeft de rustigste beweging.', { suggest: [12, 33, 32, 35] }),
    v5('Een servo heeft een motortje en krijgt zijn kracht van 5V. Op 3V3 is hij te zwak en een GPIO-pin kan hem niet voeden.'),
    gnd(GND_WHY),
  ],
  distance: [
    gpio('trigger', 'Trigger', 'Trigger stuurt het geluidssignaal weg en moet op een GPIO-pin.', { suggest: [16] }),
    gpio('echo', 'Echo', 'Echo ontvangt het teruggekaatste signaal en moet op een GPIO-pin.', { suggest: [18] }),
    v5('De HC-SR04 werkt op 5V; op 3V3 meet hij niet betrouwbaar.'),
    gnd(GND_WHY),
  ],
  oled: [
    gpio('sda', 'SDA', 'SDA is de datalijn van de I²C-bus. De Pi heeft die alleen op pin 3 (GPIO 2), dus het scherm moet daar zitten.', { only: [3], suggest: [3] }),
    gpio('scl', 'SCL', 'SCL is de kloklijn van de I²C-bus. De Pi heeft die alleen op pin 5 (GPIO 3), dus het scherm moet daar zitten.', { only: [5], suggest: [5] }),
    v33('Het OLED-scherm werkt op 3,3V. 5V kan het scherm beschadigen.'),
    gnd(GND_WHY),
  ],
}


export const terminalsOf = (kind: PartKind): TerminalSpec[] => TERMINALS[kind]

const KIND_OF_TYPE = { v5: '5v', v33: '3v3', gnd: 'gnd' } as const
const TYPE_NAME = { v5: 'een 5V-pin', v33: 'een 3V3-pin', gnd: 'een GND-pin' } as const

const pinName = (p: PiPin) => (p.gpio !== null ? `Pin ${p.physical} (GPIO ${p.gpio})` : `Pin ${p.physical} (${p.naam})`)

export interface PinFit { ok: boolean; recommended: boolean; reason?: string }

/** Past deze fysieke pin bij de terminal? Bij `ok: false` staat in `reason` waarom niet. */
export function pinFit(spec: TerminalSpec, physical: number): PinFit {
  const pin = pinByPhysical(physical)
  const no = (reason: string): PinFit => ({ ok: false, recommended: false, reason })
  if (pin.kind === 'id') return no(`${pinName(pin)} is gereserveerd voor uitbreidingskaarten (HAT) en kan niet gebruikt worden.`)
  if (spec.type === 'v5' || spec.type === 'v33' || spec.type === 'gnd') {
    if (pin.kind !== KIND_OF_TYPE[spec.type]) return no(`${pinName(pin)} past niet bij ${spec.label}: dat moet ${TYPE_NAME[spec.type]} zijn. ${spec.why}`)
    return { ok: true, recommended: spec.suggest?.[0] === physical }
  }
  if (spec.type === 'adc') return no('Dit onderdeel gaat op een kanaal van de chip, niet op een pin.')
  if (spec.lenient) return { ok: true, recommended: false }
  if (pin.kind !== 'gpio') return no(`${pinName(pin)} is een voedingspin en past niet bij ${spec.label}: daar hoort een GPIO-pin. ${spec.why}`)
  if (spec.only && !spec.only.includes(physical)) return no(`${pinName(pin)} past niet bij ${spec.label}. ${spec.why}`)
  return { ok: true, recommended: spec.suggest?.includes(physical) ?? false }
}

/** Eerste voorgestelde pin die nog vrij is (`taken` = bezette GPIO-pinnen), of null als er geen voorstel is. */
export function suggestPin(spec: TerminalSpec, taken: ReadonlySet<number>): number | null {
  const free = (p: number) => pinFit(spec, p).ok && (pinByPhysical(p).kind !== 'gpio' || !taken.has(p))
  for (const p of spec.suggest ?? []) if (free(p)) return p
  // Alle voorstellen bezet: neem de eerste vrije GPIO-pin, behalve bij vaste pinnen (I²C), waar niets anders kan.
  if (spec.suggest && !spec.only) return fittingPins(spec).find(free) ?? null
  return null
}

/** Alle fysieke pinnen die bij deze terminal passen. */
export const fittingPins = (spec: TerminalSpec): number[] => PINS.filter((p) => pinFit(spec, p.physical).ok).map((p) => p.physical)

/** Welke aansluiting is nu aan de beurt in het pinmenu: de eerstvolgende lege na `current`, anders de eerste lege, anders `current`. */
export function nextTerminal(kind: PartKind, connections: Record<string, unknown>, current?: string): string {
  const specs = terminalsOf(kind)
  const start = current ? specs.findIndex((t) => t.id === current) + 1 : 0
  const order = [...specs.slice(start), ...specs.slice(0, start)]
  return order.find((t) => !connections[t.id])?.id ?? current ?? specs[0].id
}
