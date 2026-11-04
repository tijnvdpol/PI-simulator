import type { Project } from '../project/types'

export const weatherStation: Project = {
  version: 2,
  name: 'Weerstation',
  parts: [
    { id: 'part-1', kind: 'temperature', x: 288, y: 128, connections: { signal: { type: 'adc', channel: 0 } } },
    {
      id: 'part-2', kind: 'oled', x: 704, y: 128,
      connections: { sda: { type: 'pin', physical: 3 }, scl: { type: 'pin', physical: 5 }, v33: { type: 'pin', physical: 1 }, gnd: { type: 'pin', physical: 6 } },
    },
  ],
  code: `from time import sleep
from gpiozero import MCP3008
from luma.core.interface.serial import i2c
from luma.core.render import canvas
from luma.oled.device import ssd1306
from PIL import ImageFont

sensor = MCP3008(channel=0)        # de temperatuursensor zit op kanaal 0
serial = i2c(port=1, address=0x3C) # het scherm praat via I2C (SDA en SCL)
oled = ssd1306(serial)             # OLED-scherm van 128 x 64 punten

klein = ImageFont.load_default()
groot = ImageFont.load_default(size=24)

while True:
    temperatuur = (sensor.voltage - 0.5) * 100

    # alles wat je binnen "with canvas" tekent, verschijnt daarna op het scherm
    with canvas(oled) as draw:
        draw.rectangle(oled.bounding_box, outline="white")
        draw.text((8, 6), "Weerstation", font=klein, fill="white")
        draw.text((8, 24), f"{temperatuur:.1f} C", font=groot, fill="white")

    sleep(1)
`,
}
