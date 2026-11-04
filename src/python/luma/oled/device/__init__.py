"""Alleen de ssd1306 (OLED 128×64 via I²C) bestaat in de simulator; andere chips geven een ImportError, net als een niet-geïnstalleerde driver."""
import _hw
from pyodide.ffi import to_js
from PIL import Image

from luma.core.device import device as _device
from luma.core.error import DeviceDisplayModeError
from luma.core.interface.serial import i2c

__all__ = ["ssd1306"]

_SUPPORTED = {(128, 64), (128, 32), (96, 16), (64, 48), (64, 32)}
_PANEL = (128, 64)   # het scherm op de werkbank is altijd 128 × 64; kleinere modi tekenen linksboven


class ssd1306(_device):
    def __init__(self, serial_interface=None, width=128, height=64, rotate=0, **kwargs):
        super().__init__(serial_interface)
        if (width, height) not in _SUPPORTED:
            raise DeviceDisplayModeError("Unsupported display mode: %d x %d" % (width, height))
        if rotate not in (0, 1, 2, 3):
            raise ValueError("Invalid rotation value: %r (use 0, 1, 2 or 3)" % (rotate,))
        if serial_interface is None:
            self._serial_interface = i2c()
        self.width, self.height, self.rotate = width, height, rotate
        self.mode = "1"
        self.clear()

    def display(self, image):
        if image.size != self.size:
            raise ValueError("Image size %s does not match the device size %s (%d x %d)" % (image.size, self.size, self.width, self.height))
        if image.mode != "1":
            image = image.convert("1")
        if self.rotate:
            image = image.rotate(-90 * self.rotate, expand=True)
        panel = Image.new("1", _PANEL, 0)
        panel.paste(image, (0, 0))
        _hw.writeDisplay(to_js(panel.tobytes()))

    def show(self):
        _hw.setDisplayOn(True)

    def hide(self):
        _hw.setDisplayOn(False)

    def contrast(self, level):
        if isinstance(level, bool) or not isinstance(level, int) or not 0 <= level <= 255:
            raise ValueError("Invalid contrast level: %r (use a whole number from 0 to 255)" % (level,))
        _hw.setContrast(level)
