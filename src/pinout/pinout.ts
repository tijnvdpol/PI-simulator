export type PinKind = 'gpio' | '5v' | '3v3' | 'gnd' | 'id'

export interface PiPin {
  physical: number
  kind: PinKind
  /** BCM/GPIO-nummer, of null voor voedings- en ID-pinnen. */
  gpio: number | null
  naam: string
  /** Nederlandse uitleg voor in de tooltip. */
  functie: string
}

const V5 = 'Voeding 5V — levert altijd stroom, Python kan deze pin niet aansturen'
const V33 = 'Voeding 3,3V — levert altijd stroom, Python kan deze pin niet aansturen'
const GND = 'Aarde (GND) — de min-kant van het circuit, Python kan deze pin niet aansturen'

function gpio(physical: number, g: number, functie: string): PiPin {
  return { physical, kind: 'gpio', gpio: g, naam: `GPIO ${g}`, functie }
}
const power = (physical: number, kind: '5v' | '3v3' | 'gnd', naam: string, functie: string): PiPin => ({ physical, kind, gpio: null, naam, functie })
const id = (physical: number, naam: string): PiPin => ({ physical, kind: 'id', gpio: null, naam, functie: 'Gereserveerd voor HAT-uitbreidingskaarten — niet gebruiken' })

export const PINS: readonly PiPin[] = [
  power(1, '3v3', '3V3', V33),
  power(2, '5v', '5V', V5),
  gpio(3, 2, 'Algemene pin · I²C data (SDA)'),
  power(4, '5v', '5V', V5),
  gpio(5, 3, 'Algemene pin · I²C klok (SCL)'),
  power(6, 'gnd', 'GND', GND),
  gpio(7, 4, 'Algemene pin'),
  gpio(8, 14, 'Algemene pin · seriële poort zenden (TXD)'),
  power(9, 'gnd', 'GND', GND),
  gpio(10, 15, 'Algemene pin · seriële poort ontvangen (RXD)'),
  gpio(11, 17, 'Algemene pin'),
  gpio(12, 18, 'Algemene pin · PWM (geluid/dimmen)'),
  gpio(13, 27, 'Algemene pin'),
  power(14, 'gnd', 'GND', GND),
  gpio(15, 22, 'Algemene pin'),
  gpio(16, 23, 'Algemene pin'),
  power(17, '3v3', '3V3', V33),
  gpio(18, 24, 'Algemene pin'),
  gpio(19, 10, 'Algemene pin · SPI data uit (MOSI)'),
  power(20, 'gnd', 'GND', GND),
  gpio(21, 9, 'Algemene pin · SPI data in (MISO)'),
  gpio(22, 25, 'Algemene pin'),
  gpio(23, 11, 'Algemene pin · SPI klok (SCLK)'),
  gpio(24, 8, 'Algemene pin · SPI chipselect 0 (CE0)'),
  power(25, 'gnd', 'GND', GND),
  gpio(26, 7, 'Algemene pin · SPI chipselect 1 (CE1)'),
  id(27, 'ID_SD'),
  id(28, 'ID_SC'),
  gpio(29, 5, 'Algemene pin'),
  power(30, 'gnd', 'GND', GND),
  gpio(31, 6, 'Algemene pin'),
  gpio(32, 12, 'Algemene pin · PWM'),
  gpio(33, 13, 'Algemene pin · PWM'),
  power(34, 'gnd', 'GND', GND),
  gpio(35, 19, 'Algemene pin'),
  gpio(36, 16, 'Algemene pin'),
  gpio(37, 26, 'Algemene pin'),
  gpio(38, 20, 'Algemene pin'),
  power(39, 'gnd', 'GND', GND),
  gpio(40, 21, 'Algemene pin'),
]

export function pinByPhysical(n: number): PiPin {
  const p = PINS[n - 1]
  if (!p) throw new RangeError(`Pin ${n} bestaat niet (1–40)`)
  return p
}

export function pinByGpio(g: number): PiPin | undefined {
  return PINS.find((p) => p.gpio === g)
}

/** Fysieke pinnummers van de SPI0-bus waar de MCP3008 op zit. */
export const SPI_PINS = { mosi: 19, miso: 21, sclk: 23, ce0: 24 } as const

const pos = (n: number) => ({ row: Math.floor((n - 1) / 2), col: (n - 1) % 2 })

export function nearestGnd(physical: number): number {
  const a = pos(physical)
  let best = -1
  let bestD = Infinity
  for (const p of PINS) {
    if (p.kind !== 'gnd') continue
    const b = pos(p.physical)
    const d = (a.row - b.row) ** 2 + (a.col - b.col) ** 2
    if (d < bestD) { bestD = d; best = p.physical }
  }
  return best
}
