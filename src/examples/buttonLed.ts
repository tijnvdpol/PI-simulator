import type { Project } from '../project/types'

export const buttonLed: Project = {
  version: 2,
  name: 'Knop schakelt led',
  parts: [
    { id: 'part-1', kind: 'led', x: 380, y: 140, color: 'green', connections: { signal: { type: 'pin', physical: 11 } } },
    { id: 'part-2', kind: 'button', x: 520, y: 140, connections: { signal: { type: 'pin', physical: 13 } } },
  ],
  code: `from gpiozero import LED, Button
from signal import pause

led = LED(17)        # de led zit op GPIO17
button = Button(27)  # de knop zit op GPIO27

# Elke keer dat je op de knop drukt, wisselt de led tussen aan en uit
button.when_pressed = led.toggle

pause()  # blijf wachten tot je op Stop drukt
`,
}
