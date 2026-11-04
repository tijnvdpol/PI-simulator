import type { Project } from '../project/types'

export const tempAlarm: Project = {
  version: 2,
  name: 'Temperatuuralarm',
  parts: [
    { id: 'part-1', kind: 'temperature', x: 300, y: 130, connections: { signal: { type: 'adc', channel: 0 } } },
    { id: 'part-2', kind: 'buzzer', x: 640, y: 140, connections: { signal: { type: 'pin', physical: 15 } } },
  ],
  code: `from gpiozero import MCP3008, Buzzer
from time import sleep

sensor = MCP3008(channel=0)   # de temperatuursensor zit op kanaal 0
buzzer = Buzzer(22)           # de buzzer zit op GPIO22

while True:
    # Zo reken je de spanning van de sensor om naar graden Celsius
    temperatuur = (sensor.voltage - 0.5) * 100
    print(f"{temperatuur:.1f} °C")

    if temperatuur > 30:
        buzzer.on()    # te warm: alarm!
    else:
        buzzer.off()

    sleep(0.5)
`,
}
