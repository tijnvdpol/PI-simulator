import _hw

from .devices import kind_of, warn
from .exc import SPIBadChannel


class MCP3008:
    """Analoog-naar-digitaal-chip met 8 kanalen (0–7), zoals op een echte Pi via SPI."""

    def __init__(self, channel=0, differential=False, max_voltage=3.3, **kwargs):
        if differential:
            raise NotImplementedError("differential=True wordt in de simulator nog niet ondersteund")
        if not isinstance(channel, int) or not 0 <= channel <= 7:
            raise SPIBadChannel("channel must be between 0 and 7")
        self._channel = channel
        self._max_voltage = max_voltage
        self._closed = False
        if kind_of(_hw.partKindAtChannel(channel)) is None:
            warn("pin-unconnected", "CH%d" % channel, "MCP3008")

    @property
    def channel(self):
        return self._channel

    @property
    def raw_value(self):
        return int(_hw.readAdc(self._channel))

    @property
    def value(self):
        return self.raw_value / 1023.0

    @property
    def voltage(self):
        return self.value * self._max_voltage

    @property
    def closed(self):
        return self._closed

    def close(self):
        self._closed = True

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()

    def __repr__(self):
        return "<gpiozero.MCP3008 object channel=%d>" % self._channel
