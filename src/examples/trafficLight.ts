import type { Project } from '../project/types'

export const trafficLight: Project = {
  version: 2,
  name: 'Stoplicht',
  parts: [
    { id: 'part-1', kind: 'led', x: 640, y: 128, color: 'red', connections: { signal: { type: 'pin', physical: 11 } } },
    { id: 'part-2', kind: 'led', x: 704, y: 128, color: 'yellow', connections: { signal: { type: 'pin', physical: 13 } } },
    { id: 'part-3', kind: 'led', x: 768, y: 128, color: 'green', connections: { signal: { type: 'pin', physical: 15 } } },
  ],
  code: `from gpiozero import LED
from time import sleep

rood = LED(17)    # rode led op GPIO17
geel = LED(27)    # gele led op GPIO27
groen = LED(22)   # groene led op GPIO22

while True:
    rood.on()      # stoppen
    sleep(3)
    rood.off()

    groen.on()     # rijden
    sleep(3)
    groen.off()

    geel.on()      # bijna rood
    sleep(1)
    geel.off()
`,
}
