import _hw

from ..error import DeviceNotFoundError


class i2c:
    """I²C-verbinding met het scherm. Zoals op een echte Pi: zit er niets op dat adres, dan komt er een DeviceNotFoundError."""

    def __init__(self, bus=None, port=1, address=0x3C):
        self._address = address
        self._port = port
        if port != 1:
            raise DeviceNotFoundError("I2C device not found: /dev/i2c-%d" % port)
        if not _hw.i2cPresent(address):
            raise DeviceNotFoundError("I2C device not found on address: 0x%02X" % address)

    def command(self, *cmd):
        pass

    def data(self, data):
        pass

    def cleanup(self):
        pass
