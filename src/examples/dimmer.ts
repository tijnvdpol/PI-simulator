import type { Project } from '../project/types'

export const dimmer: Project = {
  version: 2,
  name: 'Dimmer',
  parts: [
    { id: 'part-1', kind: 'potentiometer', x: 288, y: 128, connections: { signal: { type: 'adc', channel: 0 } } },
    { id: 'part-2', kind: 'pwmled', x: 704, y: 128, color: 'yellow', connections: { signal: { type: 'pin', physical: 12 } } },
  ],
  code: `from gpiozero import MCP3008, PWMLED
from time import sleep

pot = MCP3008(channel=0)   # de potmeter zit op kanaal 0
led = PWMLED(18)           # de dimbare led zit op GPIO18

while True:
    # pot.value loopt van 0 tot 1, net als de helderheid van de led
    led.value = pot.value
    sleep(0.05)
`,
}
