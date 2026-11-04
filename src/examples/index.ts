import type { Project } from '../project/types'
import { blink } from './blink'
import { buttonLed } from './buttonLed'
import { proKnop, proLed, proStoplicht } from './proExamples'
import { tempAlarm } from './tempAlarm'

export interface Example { id: string; titel: string; uitleg: string; project: Project }

export const EXAMPLES: Example[] = [
  { id: 'blink', titel: 'Knipperende led', uitleg: 'Laat een led elke seconde aan en uit gaan. Begin hier.', project: blink },
  { id: 'knop-led', titel: 'Knop schakelt led', uitleg: 'Druk op de knop om de led aan en uit te zetten.', project: buttonLed },
  { id: 'temperatuur-alarm', titel: 'Temperatuuralarm', uitleg: 'De buzzer gaat piepen als het warmer wordt dan 30 °C. Verschuif de temperatuur met het schuifje.', project: tempAlarm },
  { id: 'pro-led', titel: 'Led met weerstand (pro)', uitleg: 'Bouw je eerste schakeling op het breadboard: pin → weerstand → led → GND.', project: proLed },
  { id: 'pro-knop', titel: 'Knop op het breadboard (pro)', uitleg: 'Een knop met pull-up tussen GPIO27 en GND schakelt een led met weerstand.', project: proKnop },
  { id: 'pro-stoplicht', titel: 'Stoplicht op het breadboard (pro)', uitleg: 'Drie leds met elk een weerstand en een gedeelde min-rail.', project: proStoplicht },
]
