import type { Project } from '../project/types'

export const servoPointer: Project = {
  version: 2,
  name: 'Servo-wijzer',
  parts: [
    { id: 'part-1', kind: 'potentiometer', x: 288, y: 128, connections: { signal: { type: 'adc', channel: 0 } } },
    {
      id: 'part-2', kind: 'servo', x: 704, y: 128,
      connections: { signal: { type: 'pin', physical: 12 }, v5: { type: 'pin', physical: 2 }, gnd: { type: 'pin', physical: 6 } },
    },
  ],
  code: `from gpiozero import MCP3008, AngularServo
from time import sleep

pot = MCP3008(channel=0)   # de potmeter zit op kanaal 0
servo = AngularServo(18, min_angle=0, max_angle=180)   # de servo zit op GPIO18

while True:
    # potmeter 0 = armpje links (0 graden), potmeter 1 = rechts (180 graden)
    servo.angle = pot.value * 180
    sleep(0.05)
`,
}
