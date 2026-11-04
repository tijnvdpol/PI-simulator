import type { Project } from '../project/types'

export const parkingSensor: Project = {
  version: 2,
  name: 'Parkeersensor',
  parts: [
    {
      id: 'part-1', kind: 'distance', x: 256, y: 128,
      connections: { trigger: { type: 'pin', physical: 16 }, echo: { type: 'pin', physical: 18 }, v5: { type: 'pin', physical: 4 }, gnd: { type: 'pin', physical: 14 } },
    },
    { id: 'part-2', kind: 'buzzer', x: 704, y: 128, connections: { signal: { type: 'pin', physical: 15 } } },
  ],
  code: `from gpiozero import DistanceSensor, Buzzer
from time import sleep

sensor = DistanceSensor(echo=24, trigger=23, max_distance=4)   # meet tot 4 meter
buzzer = Buzzer(22)

while True:
    cm = sensor.distance * 100      # afstand in centimeters
    print(f"{cm:.0f} cm")

    if cm < 100:
        # dichterbij = kortere pauze = sneller piepen
        buzzer.on()
        sleep(0.05)
        buzzer.off()
        sleep(cm / 200)
    else:
        sleep(0.2)                  # ver weg: stil
`,
}
