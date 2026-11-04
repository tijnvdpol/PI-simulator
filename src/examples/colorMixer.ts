import type { Project } from '../project/types'

export const colorMixer: Project = {
  version: 2,
  name: 'Kleurenmixer',
  parts: [
    { id: 'part-1', kind: 'potentiometer', x: 96, y: 128, connections: { signal: { type: 'adc', channel: 0 } } },
    { id: 'part-2', kind: 'potentiometer', x: 192, y: 128, connections: { signal: { type: 'adc', channel: 1 } } },
    { id: 'part-3', kind: 'potentiometer', x: 288, y: 128, connections: { signal: { type: 'adc', channel: 2 } } },
    {
      id: 'part-4', kind: 'rgbled', x: 704, y: 128,
      connections: { r: { type: 'pin', physical: 11 }, g: { type: 'pin', physical: 13 }, b: { type: 'pin', physical: 15 }, gnd: { type: 'pin', physical: 14 } },
    },
  ],
  code: `from gpiozero import MCP3008, RGBLED
from time import sleep

rood = MCP3008(channel=0)    # eerste potmeter: hoeveel rood
groen = MCP3008(channel=1)   # tweede potmeter: hoeveel groen
blauw = MCP3008(channel=2)   # derde potmeter: hoeveel blauw

led = RGBLED(red=17, green=27, blue=22)

while True:
    # elke kleur is een getal van 0 tot 1; samen mengen ze een nieuwe kleur
    led.color = (rood.value, groen.value, blauw.value)
    sleep(0.05)
`,
}
