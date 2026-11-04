import { pinByGpio, type PiPin } from '../pinout/pinout'
import type { PartKind } from '../project/types'

export interface PythonErrorInfo { type: string; message: string; line: number | null; traceback: string }
export interface ErrorExplanation { titel: string; uitleg: string; regel: number | null; technisch: string }
export interface PinIssue { id: string; pin: string; message: string }

const PART_NAMES: Record<string, string> = {
  led: 'led', button: 'knop', buzzer: 'buzzer', temperature: 'temperatuursensor', potentiometer: 'potmeter',
  LED: 'led', Button: 'knop', Buzzer: 'buzzer', MCP3008: 'sensor of potmeter',
}
const TYPE_NAMES: Record<string, string> = {
  int: 'getal', float: 'kommagetal', str: 'tekst', bool: 'ja/nee-waarde', list: 'lijst', NoneType: 'niets (None)', tuple: 'tuple', dict: 'woordenboek',
}
const tn = (t: string) => TYPE_NAMES[t] ?? t

const IMPORT_TIPS: Record<string, string> = {
  LED: 'from gpiozero import LED', Button: 'from gpiozero import Button', Buzzer: 'from gpiozero import Buzzer',
  MCP3008: 'from gpiozero import MCP3008', sleep: 'from time import sleep', pause: 'from signal import pause',
}

type Rule = [RegExp, (m: RegExpExecArray, at: (s: string) => string) => string]

const nameRules: Rule[] = [
  [/name '(.+)' is not defined/, (m, at) => {
    const tip = IMPORT_TIPS[m[1]]
    const base = at(`je gebruikt \`${m[1]}\`, maar die heb je nog niet aangemaakt.`)
    return tip ? `${base} Heb je bovenaan \`${tip}\` gezet?` : base
  }],
]
const indentRules: Rule[] = [
  [/expected an indented block after '(.+)' statement on line (\d+)/, (m, at) => at(`na de regel met \`${m[1]}\` (regel ${m[2]}) moet de volgende regel inspringen. Zet er 4 spaties voor.`)],
  [/unexpected indent/, (_m, at) => at('deze regel springt te ver in. Haal de spaties aan het begin weg.')],
  [/unindent does not match/, (_m, at) => at('de inspringing van deze regel past niet bij de regels erboven. Gebruik overal evenveel spaties.')],
]
const syntaxRules: Rule[] = [
  [/expected ':'/, (_m, at) => at('je bent een dubbele punt `:` vergeten aan het einde van de regel.')],
  [/'(.)' was never closed/, (m, at) => at(`je hebt een haakje \`${m[1]}\` geopend, maar nergens gesloten.`)],
  [/unmatched '(.)'/, (m, at) => at(`er staat een haakje \`${m[1]}\` te veel (of het bijbehorende openingshaakje ontbreekt).`)],
  [/unterminated string literal/, (_m, at) => at('een tekst tussen aanhalingstekens is niet afgesloten. Zet aan het einde ook een aanhalingsteken.')],
]
const typeRules: Rule[] = [
  [/'(\w+)' object is not callable/, (m, at) => at(`je gebruikt een ${tn(m[1])} alsof het een functie is (met haakjes). Controleer of je geen naam hebt overschreven.`)],
  [/(\w+)\(\) takes (\d+) positional arguments? but (\d+) (?:was|were) given/, (m, at) => at(`de functie \`${m[1]}\` verwacht ${m[2]} waarde(n), maar jij geeft er ${m[3]}.`)],
  [/(\w+)\(\) takes exactly one argument \((\d+) given\)/, (m, at) => at(`\`${m[1]}\` verwacht precies 1 waarde, maar jij geeft er ${m[2]}.`)],
  [/missing \d+ required positional arguments?: '(\w+)'/, (m, at) => at(`je bent een verplichte waarde vergeten: \`${m[1]}\`.`)],
  [/unsupported operand type\(s\) for .+: '(\w+)' and '(\w+)'/, (m, at) => at(`je kunt een ${tn(m[1])} en een ${tn(m[2])} niet zo combineren. Zet bijvoorbeeld een getal om naar tekst met \`str()\`.`)],
  [/can only concatenate str \(not "(\w+)"\) to str/, (m, at) => at(`je plakt tekst en een ${tn(m[1])} aan elkaar. Zet het ${tn(m[1])} eerst om naar tekst met \`str()\`.`)],
]

const GROUPS: Record<string, { titel: string; rules: Rule[]; fallback: string }> = {
  NameError: { titel: 'Onbekende naam', rules: nameRules, fallback: 'je gebruikt een naam die Python niet kent.' },
  IndentationError: { titel: 'Inspringing klopt niet', rules: indentRules, fallback: 'de inspringing van deze regel klopt niet.' },
  SyntaxError: { titel: 'Schrijffout in je code', rules: syntaxRules, fallback: 'Python begrijpt deze regel niet. Controleer op typfouten, ontbrekende haakjes of dubbele punten.' },
  InputNietBeschikbaar: { titel: 'input() werkt hier niet', rules: [], fallback: 'je gebruikt `input()`, maar in de simulator kun je geen tekst intypen terwijl je programma draait. Zet de waarde die je wilt gebruiken direct in je code, bijvoorbeeld `naam = "Sam"`.' },
  GPIOPinInUse: {
    titel: 'Pin al in gebruik',
    rules: [[/pin (GPIO\d+) is already in use/, (m, at) => at(`je gebruikt ${m[1]} voor twee dingen tegelijk. Maak per pin maar één onderdeel in je code, of roep \`.close()\` aan voordat je de pin opnieuw gebruikt.`)]],
    fallback: 'je gebruikt dezelfde pin voor twee dingen tegelijk. Roep `.close()` aan voordat je de pin opnieuw gebruikt.',
  },
  GPIODeviceError: { titel: 'Pin ontbreekt', rules: [], fallback: 'je hebt niet gezegd op welke pin het onderdeel zit. Schrijf bijvoorbeeld `LED(17)` of `Button(27)`.' },
  DeviceClosed: { titel: 'Onderdeel is gesloten', rules: [], fallback: 'je gebruikt een onderdeel nadat je `.close()` hebt aangeroepen. Maak het onderdeel opnieuw aan of haal `.close()` weg.' },
  TypeError: { titel: 'Verkeerd soort waarde', rules: typeRules, fallback: 'je gebruikt een waarde van het verkeerde soort.' },
}

export function explainError(e: PythonErrorInfo): ErrorExplanation {
  const technisch = e.traceback.trim() || `${e.type}: ${e.message}`
  const line = e.line ?? null // Python None komt als undefined uit de worker
  const at = (s: string) => (line === null ? s.charAt(0).toUpperCase() + s.slice(1) : `Regel ${line}: ${s}`)
  const group = GROUPS[e.type]
  if (!group) {
    return {
      titel: 'Er ging iets mis',
      uitleg: line === null
        ? 'Er ging iets mis tijdens het uitvoeren van je programma. Open de technische melding voor details.'
        : `Regel ${line}: er ging iets mis tijdens het uitvoeren van je programma. Open de technische melding voor details.`,
      regel: line,
      technisch,
    }
  }
  for (const [re, make] of group.rules) {
    const m = re.exec(e.message)
    if (m) return { titel: group.titel, uitleg: make(m, at), regel: line, technisch }
  }
  return { titel: group.titel, uitleg: at(group.fallback), regel: line, technisch }
}

export interface PinWarning { code: 'pin-unconnected' | 'pin-wrong-kind'; pin: string; device: string; found?: string }

export function explainPinWarning(w: PinWarning): PinIssue {
  const isChannel = w.pin.startsWith('CH')
  const where = isChannel ? `kanaal ${w.pin}` : `GPIO${w.pin}`
  const device = PART_NAMES[w.device] ?? w.device
  let message: string
  if (w.code === 'pin-unconnected') {
    const phys = isChannel ? null : pinByGpio(Number(w.pin))?.physical
    if (!isChannel && phys === undefined) {
      return { id: `${w.code}:${w.pin}`, pin: w.pin, message: `Je code gebruikt ${where}, maar die pin is gereserveerd voor uitbreidingskaarten (HAT) en kan niet op de werkbank worden gekozen. Gebruik een andere pin, bijvoorbeeld GPIO17.` }
    }
    const hint = isChannel ? 'Sleep een sensor of potmeter naar de werkbank en kies dit kanaal.' : `Sleep een ${device} naar de werkbank en verbind hem met pin ${phys ?? '?'} (${where}).`
    message = `Je code gebruikt ${where} voor een ${device}, maar daar zit niets op je werkbank. ${hint}`
  } else {
    const found = PART_NAMES[w.found ?? ''] ?? w.found ?? 'ander onderdeel'
    message = `Je code verwacht een ${device} op ${where}, maar daar zit een ${found}. Pas je code aan of verbind het juiste onderdeel.`
  }
  return { id: `${w.code}:${w.pin}`, pin: w.pin, message }
}

export function explainPowerPin(part: { kind: PartKind }, pin: PiPin): string {
  const name = PART_NAMES[part.kind] ?? 'onderdeel'
  if (pin.kind === 'gnd') {
    return `Pin ${pin.physical} is een GND-pin (aarde): de min-kant van het circuit. Je ${name} kan hier niet door Python worden aangestuurd. Kies een GPIO-pin.`
  }
  const volt = pin.kind === '5v' ? '5V' : '3V3'
  return `Pin ${pin.physical} is een ${volt}-voedingspin: die geeft altijd stroom en kan niet door Python worden aangestuurd. Je ${name} doet hier dus niets. Kies een GPIO-pin.`
}
