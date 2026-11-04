import type { Project } from '../project/types'

export const proLed: Project = {
  version: 2,
  mode: 'pro',
  name: 'Led met weerstand',
  parts: [],
  pro: {
    parts: [
      { id: 'p1', kind: 'resistor', col: 5, row: 0, rot: 0, resistance: 330 },
      { id: 'p2', kind: 'led', col: 9, row: 1, rot: 0, color: 'red' },
    ],
    wires: [
      { id: 'w1', a: 'pin:11', b: 'h:b5', color: 'blue' },
      { id: 'w2', a: 'h:c10', b: 'pin:6', color: 'black' },
    ],
  },
  code: `from gpiozero import LED
from time import sleep

# De stroom loopt: pin 11 (GPIO17) -> weerstand -> led -> GND (pin 6).
# De weerstand beschermt de led. Probeer in 3D eens een andere waarde!
led = LED(17)

while True:
    led.on()
    sleep(1)
    led.off()
    sleep(1)
`,
}

export const proKnop: Project = {
  version: 2,
  mode: 'pro',
  name: 'Knop op het breadboard',
  parts: [],
  pro: {
    parts: [
      { id: 'p1', kind: 'button', col: 10, row: 4, rot: 0 },
      { id: 'p2', kind: 'resistor', col: 16, row: 0, rot: 0, resistance: 330 },
      { id: 'p3', kind: 'led', col: 20, row: 1, rot: 0, color: 'green' },
    ],
    wires: [
      { id: 'w1', a: 'pin:13', b: 'h:a10', color: 'yellow' },
      { id: 'w2', a: 'pin:9', b: 'h:j12', color: 'black' },
      { id: 'w3', a: 'pin:11', b: 'h:b16', color: 'blue' },
      { id: 'w4', a: 'h:c21', b: 'pin:6', color: 'black' },
    ],
  },
  code: `from gpiozero import LED, Button
from signal import pause

led = LED(17)        # led met weerstand op GPIO17 (pin 11)
button = Button(27)  # knop tussen GPIO27 (pin 13) en GND

# Button(27) is een "pull-up" knop: de pin is hoog, en als je indrukt
# trekt de knop hem naar GND (laag). Dat is "ingedrukt" voor gpiozero.
button.when_pressed = led.toggle

pause()  # blijf wachten tot je op Stop drukt
`,
}

export const proStoplicht: Project = {
  version: 2,
  mode: 'pro',
  name: 'Stoplicht op het breadboard',
  parts: [],
  pro: {
    parts: [
      { id: 'p1', kind: 'resistor', col: 3, row: 0, rot: 0, resistance: 330 },
      { id: 'p2', kind: 'led', col: 7, row: 1, rot: 0, color: 'red' },
      { id: 'p3', kind: 'resistor', col: 12, row: 0, rot: 0, resistance: 330 },
      { id: 'p4', kind: 'led', col: 16, row: 1, rot: 0, color: 'yellow' },
      { id: 'p5', kind: 'resistor', col: 21, row: 0, rot: 0, resistance: 330 },
      { id: 'p6', kind: 'led', col: 25, row: 1, rot: 0, color: 'green' },
    ],
    wires: [
      { id: 'w1', a: 'pin:6', b: 'r:t-:1', color: 'black' },
      { id: 'w2', a: 'r:t-:5', b: 'h:c8', color: 'black' },
      { id: 'w3', a: 'r:t-:10', b: 'h:c17', color: 'black' },
      { id: 'w4', a: 'r:t-:15', b: 'h:c26', color: 'black' },
      { id: 'w5', a: 'pin:11', b: 'h:b3', color: 'red' },
      { id: 'w6', a: 'pin:13', b: 'h:b12', color: 'yellow' },
      { id: 'w7', a: 'pin:15', b: 'h:b21', color: 'green' },
    ],
  },
  code: `from gpiozero import LED
from time import sleep

rood = LED(17)    # pin 11
geel = LED(27)    # pin 13
groen = LED(22)   # pin 15

# De drie leds delen één GND-draad via de min-rail van het breadboard.
while True:
    rood.on()
    sleep(3)
    rood.off()
    groen.on()
    sleep(3)
    groen.off()
    geel.on()
    sleep(1)
    geel.off()
`,
}
