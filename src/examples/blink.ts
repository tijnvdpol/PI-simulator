import type { Project } from '../project/types'

export const blink: Project = {
  version: 2,
  name: 'Knipperende led',
  parts: [{ id: 'part-1', kind: 'led', x: 420, y: 140, color: 'red', connections: { signal: { type: 'pin', physical: 11 } } }],
  code: `from gpiozero import LED
from time import sleep

# De led zit op pin GPIO17
led = LED(17)

while True:
    led.on()      # led aan
    sleep(1)      # wacht 1 seconde
    led.off()     # led uit
    sleep(1)
`,
}
