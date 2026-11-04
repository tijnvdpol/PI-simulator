import type { Project } from '../project/types'
import { blink } from './blink'
import { buttonLed } from './buttonLed'
import { tempAlarm } from './tempAlarm'

export interface Example { id: string; titel: string; uitleg: string; project: Project }

export const EXAMPLES: Example[] = [
  { id: 'blink', titel: 'Knipperende led', uitleg: 'Laat een led elke seconde aan en uit gaan. Begin hier.', project: blink },
  { id: 'knop-led', titel: 'Knop schakelt led', uitleg: 'Druk op de knop om de led aan en uit te zetten.', project: buttonLed },
  { id: 'temperatuur-alarm', titel: 'Temperatuuralarm', uitleg: 'De buzzer gaat piepen als het warmer wordt dan 30 °C. Verschuif de temperatuur met het schuifje.', project: tempAlarm },
]
