import type { Project } from '../project/types'
import { blink } from './blink'
import { buttonLed } from './buttonLed'
import { colorMixer } from './colorMixer'
import { dimmer } from './dimmer'
import { parkingSensor } from './parkingSensor'
import { servoPointer } from './servoPointer'
import { tempAlarm } from './tempAlarm'
import { trafficLight } from './trafficLight'
import { weatherStation } from './weatherStation'

export interface Example { id: string; titel: string; uitleg: string; project: Project }

export const EXAMPLES: Example[] = [
  { id: 'blink', titel: 'Knipperende led', uitleg: 'Laat een led elke seconde aan en uit gaan. Begin hier.', project: blink },
  { id: 'knop-led', titel: 'Knop schakelt led', uitleg: 'Druk op de knop om de led aan en uit te zetten.', project: buttonLed },
  { id: 'temperatuur-alarm', titel: 'Temperatuuralarm', uitleg: 'De buzzer gaat piepen als het warmer wordt dan 30 °C. Verschuif de temperatuur met het schuifje.', project: tempAlarm },
  { id: 'stoplicht', titel: 'Stoplicht', uitleg: 'Drie leds gaan in de juiste volgorde aan: rood, groen, geel.', project: trafficLight },
  { id: 'dimmer', titel: 'Dimmer', uitleg: 'Draai aan de potmeter om de dimbare led helderder of zwakker te maken.', project: dimmer },
  { id: 'kleurenmixer', titel: 'Kleurenmixer', uitleg: 'Drie potmeters bepalen hoeveel rood, groen en blauw de RGB-led heeft. Zo meng je elke kleur.', project: colorMixer },
  { id: 'servo-wijzer', titel: 'Servo-wijzer', uitleg: 'De potmeter bepaalt de hoek van het armpje van de servo, van 0 tot 180 graden.', project: servoPointer },
  { id: 'parkeersensor', titel: 'Parkeersensor', uitleg: 'Hoe dichterbij het voorwerp (schuifje onder de afstandssensor), hoe sneller de buzzer piept.', project: parkingSensor },
  { id: 'weerstation', titel: 'Weerstation', uitleg: 'De temperatuur verschijnt op het OLED-scherm. Verschuif de temperatuur met het schuifje.', project: weatherStation },
]
